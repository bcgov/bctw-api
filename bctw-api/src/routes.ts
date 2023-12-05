const ROUTES = {
  // templates
  getTemplate: '/get-template',
  // critterbase
  critterbase: '/cb/',
  // map
  getCritters: '/get-critters',
  getCritterTracks: '/get-critter-tracks',
  getPingsEstimate: '/get-pings-estimate',
  // animals
  getAnimals: '/get-animals',
  getAttachedHistoric: '/get-attached-historic',
  getAnimalHistory: '/get-animal-history/:animal_id',
  upsertAnimal: '/upsert-animal',
  // devices
  getAllCollars: '/get-all-collars',
  getCollarsAndDeviceIds: '/get-collars-and-deviceids',
  getAssignedCollars: '/get-assigned-collars',
  getAvailableCollars: '/get-available-collars',
  getCollarAssignmentHistory: '/get-assignment-history/:animal_id',
  getCollarChangeHistory: '/get-collar-history/:collar_id',
  getCollarChangeHistoryByDeviceId: '/get-collar-history-by-device/:device_id',
  getCollarVendors: '/get-collar-vendors',
  upsertCollar: '/upsert-collar',
  // animal/device attachment
  attachDevice: '/attach-device',
  unattachDevice: '/unattach-device',
  updateDataLife: '/update-data-life',
  getDeployments: '/get-deployments',
  getDeploymentsByCritterId: '/get-deployments-by-critter-id',
  getDeploymentsByDeviceId: '/get-deployments-by-device-id',
  updateDeployment: '/update-deployment',
  deleteDeployment: '/delete-deployment/:deployment_id',
  // manual telemetry
  deleteManualTelemetry: '/manual-telemetry/delete',
  manualTelemetry: '/manual-telemetry',
  deploymentsManualTelemetry: '/manual-telemetry/deployments',
  deploymentsVendorTelemetry: '/vendor-telemetry/deployments',
  deploymentsManualVendorTelemetry: '/all-telemetry/deployments',
  // permissions
  getPermissionRequests: '/permission-request',
  getGrantedPermissionHistory: '/permission-history',
  submitPermissionRequest: '/submit-permission-request',
  approveOrDenyPermissionRequest: '/execute-permission-request',
  // users
  signup: '/signup',
  getUser: '/get-user',
  getUsers: '/get-users',
  getUserRole: '/get-user-role',
  upsertUser: '/add-user',
  // onboarding
  getUserOnboardStatus: '/get-onboard-status',
  getOnboardingRequests: '/onboarding-requests',
  submitOnboardingRequest: '/submit-onboarding-request',
  handleOnboardingRequest: '/handle-onboarding-request',
  // user access
  getUserCritterAccess: '/get-critter-access/:user',
  assignCritterToUser: '/assign-critter-to-user',
  // udf
  upsertUDF: '/add-udf',
  getUDF: '/get-udf',
  // alerts
  getUserTelemetryAlerts: '/get-user-alerts',
  testAlertNotification: '/test-alert-notif',
  updateUserTelemetryAlert: '/update-user-alert',
  // codes
  getCode: '/get-code',
  getCodeHeaders: '/get-code-headers',
  getCodeLongDesc: '/get-code-long-desc',
  // export/import
  getExportData: '/export',
  getAllExportData: '/export-all',
  importXlsx: '/import-xlsx',
  importFinalize: '/import-finalize',
  deployDevice: '/deploy-device',
  importXML: '/import-xml',
  importTelemetry: '/import-telemetry',
  getCollarKeyX: '/get-collars-keyx',
  // vendor
  fetchTelemetry: '/fetch-telemetry',
  // delete
  deleteType: '/:type',
  deleteTypeId: '/:type/:id',
  // generic getter
  getType: '/:type/:id',
  // Health check
  health: '/health',
  notFound: '*',
};

type IRouteKey = keyof typeof ROUTES;

type IRoute = (typeof ROUTES)[IRouteKey];

export { ROUTES, IRouteKey, IRoute };
