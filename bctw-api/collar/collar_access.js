const collar_access_types = {
  view: 'view',
  manage: 'manage',
  none: 'none'
}

const can_view_collar = [
  collar_access_types.manage,
  collar_access_types.view
];

exports.collar_access_types = collar_access_types;
exports.can_view_collar = can_view_collar;