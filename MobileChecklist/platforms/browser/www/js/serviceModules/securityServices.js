var ss = angular.module('pfSecurityServices',['ngResource']);

ss.service('pfRightsService',['pfRoleService','pfUserService',function(pfRoleService,pfUserService) {
	var userRoles = [];

	var svc = {
		userRoles: userRoles,
		setRoles: function(cb) {
			cb = cb || angular.noop;

			pfRoleService.getCurrentUserRoles(pfUserService.currentUser.id).then(function(data) {
				userRoles = data;
				cb(data);
				return userRoles;
			});
		}
		,$get: function() {
			return userRoles;
		}
		,userHasRole: function(role) {   // Returns true if user has a specific role
			var hasRole = false;
			role = role.toLowerCase();

			for (var i=0; i<userRoles.length; i++) {
				var r = userRoles[i];

				var roleName = r.name.replace(/\s+/g, '').toLowerCase();
				if (role == roleName) {
					hasRole = true;
				} else if (roleName == 'globaladmin' && !(role == 'vendor' || role == 'contractor')) {
					hasRole = true;
				} else if (roleName == 'instanceadmin' && !(role == 'speakeradmin' || role == 'speakerreports' || role == 'instanceexpenseadmin' || role == 'globalexpenseadmin' || role == 'globaladmin' || role == 'vendor' || role == 'contractor')) {  // Admin inherits all unless we are asking for vendor or contractor because we will explicitly deny those.
					hasRole = true;
				} else if (roleName == 'speakeradmin' && (role == 'speakerreports')) {  // Speaker Admin inherits all other speaker roles
					hasRole = true;
				} else if (roleName == 'globalexpenseadmin' && (role == 'instanceexpenseadmin' || role == 'expenseeditor' || role == 'expenseviewer')) {  // Expense Admin inherits all other expense roles
					hasRole = true;
				} else if (roleName == 'instanceexpenseadmin' && (role == 'expenseeditor' || role == 'expenseviewer')) {  // Expense Admin inherits all other expense roles
					hasRole = true;
				} else if (roleName == 'expenseeditor' && role == 'expenseviewer') {  // Expense Editor inherits from Expense Viewer
					hasRole = true;
				}

				if (hasRole) {
					break;
				}
			}

			return hasRole;
		}
		,userHasAnyRole: function(roles) {
			var userHasARole = false;
			roles = roles.split(',');
			angular.forEach(roles,function(role) {
				if (svc.userHasRole(role)) {
					userHasARole = true;
				}
			});
			return userHasARole;
		}
		,canEditExpenses: function() {
			return svc.userHasRole('expenseEditor');
		}
		,canAdminExpenses: function() {
			return svc.userHasRole('instanceExpenseAdmin');
		}
	};
	return svc;
}]);

ss.service('pfRoleService',['$resource','$q',function($resource,$q) {
	var roleResource = $resource(
		'http://192.168.1.5:83/remote2/ActorMediator.cfc',
		{},
		{
			list: {method: 'GET',
				isArray: true,
				params: {
					method: 'listEntity',
					type: 'secRole',
					sortOrder: 'name ASC'
				}
			},
			listForActor: {
				method: 'GET',
				isArray: true,
				params: {
					method: 'getRelatedChildren',
					// relType: 'member',
					childType: 'role'
				}
			},
			save: {
				method: 'POST',
				params: {
					method: 'saveEntity',
					type: 'secRole'
				}
			},
			delete: {
				method: 'POST',
				params: {
					method: 'deleteEntity',
					type: 'secRole'
				}
			},
			saveRoles: {
				method: 'POST',
				params: {
					method: 'setRelationship',
					relType: 'member'
				}
			}
		}
	);

	this.listAllRoles = function(cb,ecb) {
		cb = cb || angular.noop;
		ecb = ecb || angular.noop;

		var d = $q.defer();

		roleResource.list(
			function(data) {
				d.resolve(data);
				cb(data);
			},
			function (e) {
				d.reject(e);
				ecb(e);
			}
		);

		return d.promise;
	};

	this.getCurrentUserRoles = function(id,cb,ecb) {
		cb = cb || angular.noop;
		ecb = ecb || angular.noop;

		var d = $q.defer();
		console.log('id in getCurrentUserRoles',id);
		roleResource.listForActor(
			{
				parentId: id
			},
			function(data) {
				d.resolve(data);
				cb(data);
			},
			function (e) {
				d.reject(e);
				ecb(e);
			}
		);

		return d.promise;
	}

	this.listForActor = function(data,cb,ecb) {
		cb = cb || angular.noop;
		ecb = ecb || angular.noop;

		var d = $q.defer();
		console.log('firing pfRoleService.listForActor',data);
		roleResource.listForActor(
			data,
			function(data) {
				d.resolve(data);
				cb(data);
			},
			function (e) {
				d.reject(e);
				ecb(e);
			}
		);

		return d.promise;
	};

	this.saveRoles = function(input,cb,ecb) {
		cb = cb || angular.noop;
		ecb = ecb || angular.noop;

		var d = $q.defer();

		roleResource.saveRoles(
			input
			,function(data) {
				d.resolve(data);
				cb(data);
			}
			,function(e) {
				d.reject(e);
				ecb(e);
			}
		);
		return d.promise;
	}
}]);