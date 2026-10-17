// Admin actions module for Dynamics 365 administration

/// <reference types="xrm" />

import { CurrentUserInfo } from '#types/global';
import { WebApiClient } from './webapi-client';
import { DynamicsUtils } from './utils';
import { dialogText } from './dialog-i18n';

interface ImpersonationUser {
  systemuserid: string;
  azureactivedirectoryobjectid: string;
  fullname: string;
  internalemailaddress: string;
  domainname: string;
}

interface SearchResult {
  users: ImpersonationUser[];
  hasMoreResults: boolean;
  totalResultsMessage?: string;
}

interface UserRoleInfo {
  name: string;
  businessUnit: string;
}

// Global variable to store current impersonation
let currentImpersonationUser: ImpersonationUser | null = null;

export class AdminActions {
  /**
   * Get environment information
   */
  static getEnvironmentInfo(): Record<string, unknown> {
    try {
      const globalContext = Xrm.Utility.getGlobalContext();
      const organizationSettings = globalContext.organizationSettings;
      const version = globalContext.getVersion();

      const envInfo = {
        organizationGeo: organizationSettings.organizationGeo,
        organizationId: organizationSettings.organizationId,
        uniqueName: organizationSettings.uniqueName,
        version: version,
        clientUrl: globalContext.getClientUrl(),
        currentUserId: globalContext.userSettings.userId,
        currentUserName: globalContext.userSettings.userName,
        organizationLanguageId: organizationSettings.languageId,
        isOnPremise: globalContext.isOnPremise,
        webResourceUrl: globalContext.getWebResourceUrl(''),
      };

      return envInfo;
    } catch (error) {
      throw new Error(
        `Failed to get environment information: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get current user information
   */
  static getCurrentUserInfo(): CurrentUserInfo {
    try {
      const globalContext = Xrm.Utility.getGlobalContext();
      const userSettings = globalContext.userSettings;

      const rolesCollection = userSettings.roles as
        | Xrm.Collection.ItemCollection<Xrm.LookupValue>
        | undefined;

      // userSettings.securityRoles only contains role IDs, so collect role
      // display names separately for a readable result in the UI
      const roles: string[] = [];
      if (rolesCollection) {
        for (let i = 0; i < rolesCollection.getLength(); i++) {
          const roleName = rolesCollection.get(i).name;
          if (roleName) {
            roles.push(roleName);
          }
        }
      }

      const userInfo: CurrentUserInfo = {
        userId: userSettings.userId,
        userName: userSettings.userName,
        languageId: userSettings.languageId,
        roles,
        securityRoles: userSettings.securityRoles as string[],
        defaultDashboardId: userSettings.defaultDashboardId,
      };

      return userInfo;
    } catch (error) {
      throw new Error(
        `Failed to get user information: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 在 D365 页面内弹出当前用户信息弹窗。
   * 使用页面级弹窗而非扩展窗口内的对话框，避免内容受侧边栏/快速模式高度限制。
   */
  static showCurrentUserInfo(): string {
    const userInfo = this.getCurrentUserInfo();
    const notAvailable = dialogText('userInfo.notAvailable');
    // 角色一行一个展示，便于逐个查看；字段名只在首行出现
    const roles: string[] =
      userInfo.roles.length > 0
        ? userInfo.roles
        : (userInfo.securityRoles?.length ?? 0) > 0
          ? userInfo.securityRoles
          : [];
    const roleRows: string[][] =
      roles.length > 0
        ? roles.map((role, index) => [index === 0 ? dialogText('userInfo.roles') : '', role])
        : [[dialogText('userInfo.roles'), dialogText('userInfo.noRoles')]];

    DynamicsUtils.createMuiPopup({
      id: 'levelup-user-info-popup',
      title: dialogText('userInfo.title'),
      tables: [
        {
          title: dialogText('userInfo.tableTitle'),
          headers: [dialogText('userInfo.fieldHeader'), dialogText('userInfo.valueHeader')],
          rows: [
            [dialogText('userInfo.userId'), userInfo.userId],
            [dialogText('userInfo.userName'), userInfo.userName],
            [
              dialogText('userInfo.languageId'),
              userInfo.languageId ? String(userInfo.languageId) : notAvailable,
            ],
            ...roleRows,
          ],
        },
      ],
      layoutMode: 'standard',
      showOpenInNewTab: true,
    });

    return dialogText('userInfo.title');
  }

  /**
   * Check if the current user has a specific privilege
   */
  static async checkUserPrivilege(privilegeName: string): Promise<boolean> {
    // Ensure Xrm context is available
    if (typeof Xrm === 'undefined' || !Xrm.Utility) {
      throw new Error('Xrm context not available');
    }

    // For the specific case of impersonation privilege, use FetchXML to check
    if (privilegeName === 'prvActOnBehalfOfAnotherUser') {
      const fetchXml = `
        <fetch count="1">
          <entity name="roleprivileges">
            <link-entity name="role" from="roleid" to="roleid">
              <attribute name="name" />
              <attribute name="isinherited" />
              <link-entity name="systemuserroles" from="roleid" to="roleid" intersect="true">
                <filter>
                  <condition attribute="systemuserid" operator="eq-userid" />
                </filter>
              </link-entity>
            </link-entity>
            <link-entity name="privilege" from="privilegeid" to="privilegeid" link-type="inner">
              <filter>
                <condition attribute="name" operator="eq" value="${privilegeName}" />
              </filter>
            </link-entity>
          </entity>
        </fetch>
      `;

      try {
        const webApiClient = WebApiClient.getInstance();
        const result = await webApiClient.executeFetchXml('roleprivilegescollection', fetchXml);

        // If we get any results, the user has the privilege
        return result && result.entities && result.entities.length > 0;
      } catch (fetchError) {
        // Fallback to role name check if FetchXML fails
        try {
          const globalContext = Xrm.Utility.getGlobalContext();
          const userRoles = globalContext.userSettings
            .roles as Xrm.Collection.ItemCollection<Xrm.LookupValue>;

          if (!userRoles || userRoles.getLength() === 0) {
            return false;
          }

          // Check if user is a system administrator (usually has all privileges)
          for (let i = 0; i < userRoles.getLength(); i++) {
            const role = userRoles.get(i);
            const roleName = role.name?.toLowerCase();

            // System Administrator role typically has all privileges including impersonation
            if (roleName === 'system administrator') {
              return true;
            }
          }

          return false;
        } catch (roleError) {
          // If both FetchXML and role check fail, throw the original error
          throw fetchError;
        }
      }
    }
    // For other privileges, implement as needed
    return false;
  }

  /**
   * Get organization settings
   */
  static getOrganizationSettings(): Record<string, unknown> {
    try {
      const globalContext = Xrm.Utility.getGlobalContext();
      const orgSettings = globalContext.organizationSettings;

      const settings = {
        organizationId: orgSettings.organizationId,
        uniqueName: orgSettings.uniqueName,
        languageId: orgSettings.languageId,
        organizationGeo: orgSettings.organizationGeo,
        baseCurrencyId: orgSettings.baseCurrencyId,
        defaultCountryCode: orgSettings.defaultCountryCode,
        isAutoSaveEnabled: orgSettings.isAutoSaveEnabled,
      };

      return settings;
    } catch (error) {
      throw new Error(
        `Failed to get organization settings: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get client information
   */
  static getClientInfo(): Record<string, unknown> {
    try {
      const globalContext = Xrm.Utility.getGlobalContext();

      const clientInfo = {
        client: globalContext.client,
        clientUrl: globalContext.getClientUrl(),
        currentTheme: globalContext.getCurrentTheme(),
        isOnPremise: globalContext.isOnPremise,
        organizationUrl: globalContext.getClientUrl(),
        version: globalContext.getVersion(),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
      };

      return clientInfo;
    } catch (error) {
      throw new Error(
        `Failed to get client information: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Search for users by name or email with result truncation notifications
   */
  static async searchUsers(query: string): Promise<SearchResult> {
    try {
      console.log('🔍 [AdminActions] searchUsers called with query:', query);
      const webApiClient = WebApiClient.getInstance();
      console.log('🔍 [AdminActions] Got WebApiClient instance, calling searchUsers...');
      const result = await webApiClient.searchUsers(query);
      console.log('🔍 [AdminActions] WebApiClient.searchUsers returned:', result);
      console.log('🔍 [AdminActions] Result users array length:', result?.users?.length);
      return result;
    } catch (error) {
      console.error('🔍 [AdminActions] Error searching users:', error);
      throw new Error(
        `Failed to search users: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Show the security roles directly assigned to a user in a table dialog
   */
  static async showUserRoles(data: { userId: string; userName?: string }): Promise<string> {
    if (!data?.userId) {
      throw new Error('User ID is required to retrieve security roles');
    }

    // GUIDs may arrive wrapped in braces from Xrm lookups
    const userId = data.userId.replace(/[{}]/g, '');
    const userName = data.userName || userId;

    try {
      const roles = await this.retrieveUserRoles(userId);

      if (roles.length === 0) {
        DynamicsUtils.showToast(dialogText('userRoles.none'), 'info');
        return dialogText('userRoles.none');
      }

      DynamicsUtils.createMuiPopup({
        id: 'levelup-user-roles-popup',
        title: dialogText('userRoles.title', { user: userName }),
        tables: [
          {
            title: dialogText('userRoles.tableTitle'),
            description: dialogText('userRoles.description', {
              count: roles.length,
              user: userName,
            }),
            headers: [
              dialogText('userRoles.roleHeader'),
              dialogText('userRoles.businessUnitHeader'),
            ],
            rows: roles.map(role => [role.name, role.businessUnit]),
          },
        ],
        layoutMode: 'standard',
        enableSearch: true,
        showOpenInNewTab: true,
      });

      return dialogText('userRoles.found', { count: roles.length });
    } catch (error) {
      console.error('[AdminActions] Failed to retrieve user roles:', error);
      DynamicsUtils.showToast(dialogText('userRoles.retrieveError'), 'error');
      throw new Error(
        `Failed to retrieve user roles: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Retrieve security roles directly assigned to a user.
   * The systemuserroles intersect entity only contains roles assigned to the user
   * itself, so roles inherited from teams are intentionally excluded.
   */
  private static async retrieveUserRoles(userId: string): Promise<UserRoleInfo[]> {
    // 以交集实体 systemuserroles 为主实体，直接按 systemuserid 过滤，
    // 比反向 intersect 联查更可靠；业务部门通过嵌套 link-entity 取名称
    const fetchXml = `
      <fetch>
        <entity name="systemuserroles">
          <attribute name="roleid" />
          <filter>
            <condition attribute="systemuserid" operator="eq" value="${userId}" />
          </filter>
          <link-entity name="role" from="roleid" to="roleid" link-type="inner" alias="r">
            <attribute name="name" />
            <link-entity name="businessunit" from="businessunitid" to="businessunitid" link-type="inner" alias="bu">
              <attribute name="name" />
            </link-entity>
          </link-entity>
        </entity>
      </fetch>
    `;

    const webApiClient = WebApiClient.getInstance();
    // 交集实体的 Web API 集合名带 collection 后缀，与 roleprivilegescollection 一致
    const result = await webApiClient.executeFetchXml('systemuserrolescollection', fetchXml);
    const entities = (result?.entities ?? []) as Array<Record<string, unknown>>;

    return entities.map(entity => ({
      name: String(entity['r.name'] ?? ''),
      // Link-entity attributes are prefixed with the alias in Web API responses
      businessUnit: String(entity['bu.name'] ?? ''),
    }));
  }

  /**
   * Start impersonation for a specific user
   */
  static startImpersonation(user: ImpersonationUser): boolean {
    try {
      if (!user.azureactivedirectoryobjectid) {
        throw new Error('User does not have an Azure AD Object ID');
      }

      currentImpersonationUser = user;
      console.log(
        'Started impersonating user:',
        user.fullname,
        'with Azure AD ID:',
        user.azureactivedirectoryobjectid
      );

      // Note: Actual header injection is now handled by the background script via declarativeNetRequest
      // This is more secure and reliable than function overriding

      return true;
    } catch (error) {
      console.error('Error starting impersonation:', error);
      throw new Error(
        `Failed to start impersonation: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Stop impersonation
   */
  static stopImpersonation(): boolean {
    try {
      currentImpersonationUser = null;
      console.log('Stopped impersonation');
      return true;
    } catch (error) {
      console.error('Error stopping impersonation:', error);
      throw new Error(
        `Failed to stop impersonation: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get current impersonation status
   */
  static getCurrentImpersonation(): ImpersonationUser | null {
    return currentImpersonationUser;
  }
}
