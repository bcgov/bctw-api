import { Audience } from "./types/userRequest";

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
  getCollarVendors: '/get-collar-vendors',
  upsertCollar: '/upsert-collar',
  // animal/device attachment
  attachDevice: '/attach-device',
  unattachDevice: '/unattach-device',
  updateDataLife: '/update-data-life',
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

type IRoute = typeof ROUTES[IRouteKey];

const ROUTE_AUDIENCES: { [key in IRouteKey]?: Audience[] } = {
    [ROUTES.getTemplate]: [],
    [ROUTES.critterbase]: ['BCTW'],
    [ROUTES.getCritters]: ['BCTW'],
    [ROUTES.getCritterTracks]: ['BCTW'],
    [ROUTES.getPingsEstimate]: ['BCTW'],
    [ROUTES.getAnimals]: ['BCTW'],
    [ROUTES.getAttachedHistoric]: ['BCTW'],
    [ROUTES.getAnimalHistory]: ['BCTW'],
    [ROUTES.upsertAnimal]: ['BCTW'],
    [ROUTES.getAllCollars]: ['BCTW'],
    [ROUTES.getCollarsAndDeviceIds]: ['BCTW'],
    [ROUTES.getAssignedCollars]: ['BCTW'],
    [ROUTES.getAvailableCollars]: ['BCTW'],
    [ROUTES.getCollarAssignmentHistory]: ['BCTW'],
    [ROUTES.getCollarChangeHistory]: ['BCTW'],
    [ROUTES.getCollarVendors]: ['BCTW', 'SIMS'],
    [ROUTES.upsertCollar]: ['BCTW'],
    [ROUTES.attachDevice]: ['BCTW'],
    [ROUTES.unattachDevice]: ['BCTW'],
    [ROUTES.updateDataLife]: ['BCTW'],
    [ROUTES.getPermissionRequests]: ['BCTW'],
    [ROUTES.getGrantedPermissionHistory]: ['BCTW'],
    [ROUTES.submitPermissionRequest]: ['BCTW'],
    [ROUTES.approveOrDenyPermissionRequest]: ['BCTW'],
    [ROUTES.getUser]: ['BCTW'],
    [ROUTES.getUsers]: ['BCTW'],
    [ROUTES.getUserRole]: ['BCTW'],
    [ROUTES.signup]: ['SIMS_SERVICE'], // Only the SIMS service can signup users directly.
    [ROUTES.upsertUser]: ['BCTW'],
    [ROUTES.getUserOnboardStatus]: [], // Open to all common-realm users.
    [ROUTES.getOnboardingRequests]: ['BCTW'],
    [ROUTES.submitOnboardingRequest]: [],
    [ROUTES.handleOnboardingRequest]: ['BCTW'],
    [ROUTES.getUserCritterAccess]: ['BCTW'],
    [ROUTES.assignCritterToUser]: ['BCTW'],
    [ROUTES.upsertUDF]: ['BCTW'],
    [ROUTES.getUDF]: ['BCTW'],
    [ROUTES.getUserTelemetryAlerts]: ['BCTW'],
    [ROUTES.testAlertNotification]: ['BCTW'],
    [ROUTES.updateUserTelemetryAlert]: ['BCTW'],
    [ROUTES.getCode]: ['BCTW'],
    [ROUTES.getCodeHeaders]: ['BCTW'],
    [ROUTES.getCodeLongDesc]: ['BCTW'],
    [ROUTES.getExportData]: ['BCTW'],
    [ROUTES.getAllExportData]: ['BCTW'],
    [ROUTES.importXlsx]: ['BCTW'],
    [ROUTES.importFinalize]: ['BCTW'],
    [ROUTES.deployDevice]: ['SIMS'], // Only SIMS users may do this.
    [ROUTES.importXML]: ['BCTW'],
    [ROUTES.importTelemetry]: ['BCTW'],
    [ROUTES.getCollarKeyX]: ['BCTW'],
    [ROUTES.fetchTelemetry]: ['BCTW'],
    [ROUTES.deleteType]: ['BCTW'],
    [ROUTES.deleteTypeId]: ['BCTW'],
    [ROUTES.getType]: ['BCTW'],
    [ROUTES.health]: [],
    [ROUTES.notFound]: [],
  };

export { ROUTES, IRouteKey, IRoute, ROUTE_AUDIENCES };