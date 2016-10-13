var as = angular.module('pfActorServices',['PFuncFirebase','instanceDataModule','pfUI','pfSecurityServices']);

as.filter('activeFilter',[function() {
	return function(input) {
		var ret = [];
		angular.forEach(input,function(item) {
			if (item.sys_active) ret.push(item);
		});
		return ret;
	}
}]);



as.service('pfUserService',['$rootScope','$resource','$q','$popup',function($rootScope,$resource,$q,$popup) {

	var userResource = $resource(
		'http://192.168.1.5:83/api/actorData.cfc'
		,{}
		,{
			getCurrentUser: {
				method: 'GET',
				params: {
					method: 'getCurrentUser'
				}
			},
			list: {
				method: 'GET',
				isArray: true,
				params: {
					method: 'listUsers'
				}
			},
			get: {
				method: 'GET',
				isArray: false,
				params: {
					method: 'listUsers'
				}
			},
			save: {
				method: 'POST',
				params: {
					method: 'saveUser'
				}
			},
			archiveUser: {
				method: 'POST',
				params: {
					method: 'archiveActor'
				}
			},
			restoreUser: {
				method: 'POST',
				params: {
					method: 'restoreActor'
				}
			}
		}
	);

	var _usersLoaded = false;
	var _currentUser = {};
	var _allUsers = [];
	var _activeUsers = [];
	var _validateUserMessages = {};

	function _validateUser(data) {
		var isValid = true;
		_validateUserMessages = {};

		if (!data.username) {
			isValid = false;
			_validateUserMessages.username = "Username is required.";
		}

		if (!data.fname) {
			isValid = false;
			_validateUserMessages.fname = "First Name is required.";
		}

		if (!data.email) {
			isValid = false;
			_validateUserMessages.email = "Email is required.";
		}

		if (!data.type) {
			isValid = false;
			_validateUserMessages.type = "Type is required.";
		}

		if (!data.id) {
			if (data.type == 'Vendor') {
				if (!data.resetPassword) {
					isValid = false;
					_validateUserMessages.resetPassword = "Password is required.";
				}
				if (!data.password_confirm) {
					isValid = false;
					_validateUserMessages.password_confirm = "Confirm Password is required.";
				}
			}
		}

		if (data.resetPassword !== data.password_confirm) {
			isValid = false;
			_validateUserMessages.password_confirm = "Passwords do not match.";
		}

		return isValid;
	}
	function _listUsers(cb,ecb) {
		cb = cb || angular.noop;
		ecb = ecb || angular.noop;

		var d = $q.defer();

		userResource.list(
			{show:'all'},
			function (data) {
				_allUsers.length = 0;
				_activeUsers.length = 0;

				// Manipulate data returned from the server
				angular.forEach(data,function(user) {
					user.searchText = user.username + ' | ' + user.fname + ' ' + user.lname;

					_allUsers.push(user);
					if (user.sys_active) _activeUsers.push(user);
				});

				_usersLoaded = true;

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

	$rootScope.$on('event:user-updated',function(evt,args) {
		console.log('receiving event:user-updated',args);

		var user = _.find(_allUsers,function(item) {
			return item.id === args.userId;
		});

		if (user) {
			console.info('user found, update data',user);
			for (var key in args.changeSet) {
				user[key] = args.changeSet[key].newData;
			}
		} else {
			console.warn('handle as create and bounce out')
		}
	});

	$rootScope.$on('event:user-created',function(evt,args) {
		console.log('receiving event:user-updated',args);


	});

	return {
		usersLoaded: _usersLoaded
		,allUsers: _allUsers
		,activeUsers: _activeUsers
		,currentUser: _currentUser
		,getCurrentUser: function(cb,ecb) {
			console.log('firing getCurrentUser');
			cb = cb || angular.noop;
			ecb = ecb || angular.noop;

			var d = $q.defer();

			userResource.getCurrentUser(
				{}
				,function(data) {
					console.log('response from getCurrentUser');
					console.log(data);
					//_currentUser = {};
					for (var prop in data) {
						if (data.hasOwnProperty(prop)) _currentUser[prop] = data[prop];
					}
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
		,getUser: function(input,cb,ecb) {
			cb = cb || angular.noop;
			ecb = ecb || angular.noop;

			var d = $q.defer();

			userResource.get(
				input
				,function(data) {
					for (var user in data) {
						user.name = user.fname + ' ' + user.lname;
					}
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
		,getGenericUser: function(input,cb,ecb) {
			this.doGeneric(userResource,'get',input,function(data) {
				console.info('success');
				console.log(data);
			},function(err) {
				console.error(err);
			})
		}
		,doGeneric: function(resource,method,data,cb,ecb) {
			cb = cb || angular.noop;
			ecb = ecb || angular.noop;

			var d = $q.defer();

			resource[method](
				data
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
		,listAllUsers: _listUsers
		,getUserInfo: function(userId) {
			userId = userId || _currentUser.id;
			return _.find(_allUsers,function(item) {
				return item.id === userId;
			});
		}
		,getUserInfoByUsername: function(username) {
			return _.find(_allUsers,function(item) {
				return item.username === username;
			});
		}
		,saveUser: function(data,cb,ecb) {
			cb = cb || angular.noop;
			ecb = ecb || angular.noop;

			var d = $q.defer();

			if (_validateUser(data)) {
				userResource.save(
					data
					,function(data) {
						data.searchText = data.username + ' | ' + data.name;

						d.resolve(data);
						cb(data);
					}
					,function(e) {
						d.reject(e);
						ecb(e);
					}
				);
				return d.promise;
			} else {
				$popup.show({
					title: 'An Error Occurred'
					,template: 'Could not save user.  Please see console for details.'
				});
				console.error('Invalid data for saveUser',_validateUserMessages);
			}
		}
		,archiveUser: function(userId,cb,ecb) {
			cb = cb || angular.noop;
			ecb = ecb || angular.noop;

			var d = $q.defer();

			userResource.archiveUser(
				{
					id:userId
				}
				,function(data) {
					//console.log('data back from userResource.archiveUser',data);
					data.type = 'userArchived';
					//pfFireSyncService.announce(data);

					_listUsers();
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
		,restoreUser: function(userId,cb,ecb) {
			cb = cb || angular.noop;
			ecb = ecb || angular.noop;

			var d = $q.defer();

			userResource.restoreUser(
				{
					id:userId
				}
				,function(data) {
					//console.log('data back from userResource.restoreUser',data);
					data.type = 'userRestored';
					//pfFireSyncService.announce(data);

					_listUsers();
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
	};

}]);

as.service('pfGroupService',['$resource','$q','$popup',function($resource,$q,$popup) {
	var groupResource = $resource(
		'http://192.168.1.5:83/api/actorData.cfc'
		,{}
		,{
			listGroups: {
				method: 'GET'
				,isArray: true
				,params: {
					method: 'listGroups'
				}
			}
			,getGroup: {
				method: 'GET'
				,isArray: false
				,params: {
					method: 'listGroups'
				}
			}
			,saveGroup: {
				method: 'POST'
				,params: {
					method: 'saveGroup'
				}
			}
			,archiveGroup: {
				method: 'POST',
				params: {
					method: 'archiveActor'
				}
			}
			,restoreGroup: {
				method: 'POST',
				params: {
					method: 'restoreActor'
				}
			}
		}
	);



	var _groupsLoaded = false;
	var _allGroups = [];
	var _activeGroups = [];
	var _validateGroupMessages = {};

	function _validateGroup(data) {
		var isValid = true;
		_validateGroupMessages = {};

		if (!data.name) {
			isValid = false;
			_validateGroupMessages.name = "Name is required.";
		}

		if (!data.type) {
			isValid = false;
			_validateGroupMessages.type = "Type is required.";
		}

		return isValid;
	}
	function _listGroups(input,cb,ecb) {
		input = input || {};
		cb = cb || angular.noop;
		ecb = ecb || angular.noop;

		var d = $q.defer();

		groupResource.listGroups(
			input
			,function (data) {

				if (!input.id && !input.searchTerm) {
					_allGroups.length = 0;
					_activeGroups.length = 0;

					angular.forEach(data,function(group) {
						_allGroups.push(group);

						if (group.sys_active) _activeGroups.push(group);
					});

					_groupsLoaded = true;
				} else {
					if (input.id && data.length) {
						data = data[0];
					}
				}

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
	function _getGroupById(id,cb,ecb) {
		cb = cb || angular.noop;
		ecb = ecb || angular.noop;

		var d = $q.defer();

		groupResource.getGroup(
			{id:id}
			,function (data) {
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

	return {
		groupsLoaded: _groupsLoaded
		,allGroups: _allGroups
		,activeGroups: _activeGroups
		,listGroups: _listGroups
		,getGroupById: _getGroupById
		,saveGroup: function(data,cb,ecb) {
			cb = cb || angular.noop;
			ecb = ecb || angular.noop;

			var d = $q.defer();

			var state = 'groupCreated';
			if (data.id) state = 'groupUpdated';

			if (_validateGroup(data)) {
				groupResource.saveGroup(
					data
					,function(data) {
						data.type = state;
						//pfFireSyncService.announce(data);

						_listGroups();

						d.resolve(data);
						cb(data);
					}
					,function(e) {
						d.reject(e);
						ecb(e);
					}
				);
				return d.promise;
			} else {
				//console.error('Invalid data for saveGroup',_validateGroupMessages);
				$popup.show({
					title: 'An Error Occurred'
					,template: 'Could not save group.  Please see console for details.'
				});
			}
		}

		,archiveGroup: function(groupId,cb,ecb) {
			cb = cb || angular.noop;
			ecb = ecb || angular.noop;

			var d = $q.defer();

			groupResource.archiveGroup(
				{
					id:groupId
				}
				,function(data) {
					//console.log('data back from groupResource.archiveGroup',data);
					data.type = 'groupArchived';
					//pfFireSyncService.announce(data);

					_listGroups();
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
		,restoreGroup: function(groupId,cb,ecb) {
			cb = cb || angular.noop;
			ecb = ecb || angular.noop;

			var d = $q.defer();

			groupResource.restoreGroup(
				{
					id:groupId
				}
				,function(data) {
					//console.log('data back from groupResource.restoreGroup',data);
					data.type = 'groupRestored';
					//pfFireSyncService.announce(data);

					_listGroups();
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
	}
}]);


as.controller('UserAdminController',['$scope','$rootScope','$timeout','pfUserService','pfGroupService','pfRoleService','pfUtils',function($scope,$rootScope,$timeout,pfUserService,pfGroupService,pfRoleService,pfUtils) {

	$scope.allUsers = pfUserService.allUsers;

	$scope.sortColumn = pfUtils.sortColumn;
	$scope.sort = {column:['instancePrefix','fname','lname']};


	// Default filter params
	$scope.userFilter = {
		sys_active: 1
	};

	$scope.editUser = function(user) {
		$rootScope.$broadcast('trigger:admin-edit-user',{id:user.id});
	};

	$scope.addUser = function () {
		$rootScope.$broadcast('trigger:admin-edit-user');
	};

	$scope.$on('trigger:admin-user-updated',function(evt,args) {
		pfUserService.listAllUsers();
	})


}]);

as.controller('GroupAdminController',['$scope','$rootScope','pfUserService','pfGroupService','pfUtils',function($scope,$rootScope,pfUserService,pfGroupService,pfUtils) {
	$scope.allGroups = pfGroupService.allGroups;

	$scope.sortColumn = pfUtils.sortColumn;
	$scope.sort = {column:['instancePrefix','name']};

	// Default filter params
	$scope.groupFilter = {
		sys_active: 1
	};

	$scope.selectedGroupClass = function(group) {
		return {
			info: $scope.selectedGroup === group
		}
	};


	// Default filter params
	$scope.groupFilter = {};
	$scope.groupFilter.sys_active = 1;

	$scope.groups = pfGroupService.listGroups();


	/****
	 * Groups
	 *****/
	$scope.addGroup = function () {
		$rootScope.$broadcast('trigger:admin-edit-group');
	};

	$scope.editGroup = function(group) {
		$rootScope.$broadcast('trigger:admin-edit-group',{id:group.id});
	};

}]);


as.controller('userEditorController',['$scope','$element','$rootScope','appConfig','pfUserService','pfRoleService','pfInstanceService',function($scope,$element,$rootScope,appConfig,pfUserService,pfRoleService,pfInstanceService) {
	$scope.controllerName = "userEditorController";
	$scope.debugMode = true;
	$scope.state = null;

	angular.extend($scope,appConfig.appSettings);

	$scope.userTypeList = [{val:'Staff',disp:'Novell Login'},{val:'Vendor',disp:'PFunc Login'}];

	pfInstanceService.getInstances(function(data) {
		angular.forEach(data,function(item) {
			item.itemName = item.prefix + ' - ' + item.name;
		});
		$scope.instances = data;
	},genericError);

	pfRoleService.listAllRoles(function(data) {
		$scope.roles = data;
	});


	$scope.show = function() {
		$element.removeClass('hide');
		$rootScope.$broadcast('trigger:show-modal-backdrop');
	};
	$scope.hide = function() {
		$element.addClass('hide');
		$rootScope.$broadcast('trigger:hide-modal-backdrop');
	};
	$scope.toggle = function() {
		$element.hasClass('hide') && $scope.show() || $scope.hide();
	};




	/****
	 * Roles
	 *****/
	$scope.selectRole = function(role) {

		$scope.selectedRole.added = true;
		$scope.userRoles.push($scope.selectedRole);

		$scope.rolesWereChanged = true;
	};

	$scope.removeRole = function (role) {

		// if it was just added, we can safely remove it
		if(role.added) {
			delete role.added;
			$scope.userRoles.splice($scope.userRoles.indexOf(role),1);
			$scope.selectedRole = '';
		} else {
			// Set aside the roles that need to be removed on the next save
			role.remove = true;
		}

		$scope.rolesWereChanged = true;
	};
	$scope.unremoveRole = function (role) {
		// Set aside the roles that need to be removed on the next save
		role.remove = false;

		$scope.rolesWereChanged = true;
	};

	$scope.saveRoles = function () {

		// Need to go backwards because we will remove items from the array
		for(var i = $scope.userRoles.length - 1 ; i >=0 ; i--) {
			var role = $scope.userRoles[i];
			if(role.remove)
				$scope.userRoles.splice($scope.userRoles.indexOf(role),1);
				delete role.remove;
			if(role.added)
				delete role.added;
		}

		pfRoleService.saveRoles(
			{parentId: $scope.user.id, children: $scope.userRoles, relType:'role'},
			// success
			function(s) {
				angular.forEach($scope.userRoles, function(role) {
					role.saved = true;
				});

				angular.forEach($scope.userRoles, function(role) {
					delete role.saved;
				});
				
				$scope.rolesWereChanged = false;
			},
			// error
			function(e) {
				console.log('Error saving roles');
				console.log(e);
			});

	};



	$scope.startEdit = function(args) {
		args = args || {};

		args.instanceId = args.instanceId || appConfig.instanceId;

		$scope.userRoles = [];
		$scope.selectedRole = '';

		if (args.id) {
			$scope.state = 'update';
			pfUserService.getUser(
				{id:args.id}
				,function(data) {
					//console.log('back from getUser',data);
					$scope.user = data;

					$scope.show();
				},genericError
			);

			pfRoleService.listForActor({parentId: args.id}, function(data) {
				//console.log('roles for actor',data);
				angular.forEach(data, function(role) {
					var roleIds = _.pluck($scope.roles, 'id');
					if(roleIds.indexOf(role.id) >= 0)
						$scope.userRoles.push($scope.roles[roleIds.indexOf(role.id)]);
				});
			});
		} else {
			$scope.state = 'create';
			$scope.user = {
				type: 'Staff'
				,instanceId: args.instanceId
				,sys_active: 1
			};

			$scope.show();
		}


	};

	$scope.validate = function() {
		var isValid = true;
		$scope.errordata = {};

		if (!$scope.user.username) {
			isValid = false;
			$scope.errordata.username = "Username is required.";
		}

		if (!$scope.user.fname) {
			isValid = false;
			$scope.errordata.fname = "First Name is required.";
		}

		if (!$scope.user.email) {
			isValid = false;
			$scope.errordata.email = "Email is required.";
		}

		if (!$scope.user.type) {
			isValid = false;
			$scope.errordata.type = "Type is required.";
		}

		if (!$scope.user.id) {
			if ($scope.user.type == 'Vendor') {
				if (!$scope.user.resetPassword) {
					isValid = false;
					$scope.errordata.resetPassword = "Password is required.";
				}
				if (!$scope.user.password_confirm) {
					isValid = false;
					$scope.errordata.password_confirm = "Confirm Password is required.";
				}
			}
		}

		if ($scope.user.resetPassword !== $scope.user.password_confirm) {
			isValid = false;
			$scope.errordata.password_confirm = "Passwords do not match.";
		}

		return isValid;
	};

	$scope.saveUser = function() {
		if ($scope.validate()) {
			$scope.isSaving = true;
			//console.log('firing $scope.saveUser',$scope.user);
			$scope.user.name = $scope.user.fname + " " + $scope.user.lname;

			pfUserService.saveUser($scope.user,function(data) {
				//console.log('data back from pfUserService.saveUser',data);
				$scope.isSaving = false;
				$rootScope.$broadcast('trigger:admin-user-updated',{id:data.id,type:$scope.state,data:data});

				$scope.cancelEdit();
			},genericError);

			$scope.saveRoles();
		}
	};

	$scope.cancelEdit = function() {
		delete $scope.user;
		$scope.state = null;
		$scope.hide();
	};



	$scope.archiveUser = function(id) {
		pfUserService.archiveUser(id,function(data) {
			$rootScope.$broadcast('trigger:admin-user-updated',{id:id,type:'archive',data:data});
			$scope.cancelEdit();
		},genericError);
	};

	$scope.restoreUser = function(id) {
		pfUserService.restoreUser(id,function(data) {
			$rootScope.$broadcast('trigger:admin-user-updated',{id:id,type:'restore',data:data});
			$scope.cancelEdit();
		},genericError);
	};



	$scope.$on('trigger:admin-edit-user',function(evt,args) {
		$scope.startEdit(args);
	});

	$scope.$on('trigger:close-all-modals',function(event,args) {
		$scope.cancelEdit();
	});

}]);
as.directive('userEditor',[function() {
	return {
		restrict: 'A'
		,scope: true
		,templateUrl: 'partials/app/popups/template-admin-userEditor.html'
		,controller: 'userEditorController'
	}
}]);

as.controller('groupEditorController',['$scope','$element','$rootScope','appConfig','pfUserService','pfGroupService','pfInstanceService',function($scope,$element,$rootScope,appConfig,pfUserService,pfGroupService,pfInstanceService) {
	$scope.controllerName = "groupEditorController";
	$scope.debugMode = true;
	$scope.state = null;

	$scope.activeUsers = pfUserService.activeUsers;

	$scope.selectedGroupUsers = [];

	$scope.groupTypeList = [{val:'Team',disp:'Team'},{val:'Company',disp:'Company'}];

	pfInstanceService.getInstances(function(data) {
		angular.forEach(data,function(item) {
			item.itemName = item.prefix + ' - ' + item.name;
		});
		$scope.instances = data;
	},genericError);

	angular.extend($scope,appConfig.appSettings);

	$scope.show = function() {
		$element.removeClass('hide');
		$rootScope.$broadcast('trigger:show-modal-backdrop');
	};
	$scope.hide = function() {
		$element.addClass('hide');
		$rootScope.$broadcast('trigger:hide-modal-backdrop');
	};
	$scope.toggle = function() {
		$element.hasClass('hide') && $scope.show() || $scope.hide();
	};

	$scope.startEdit = function(args) {
		args = args || {};

		args.instanceId = args.instanceId || appConfig.instanceId;

		if (args.id) {
			$scope.state = 'update';
			pfGroupService.listGroups(
				{id:args.id}
				,function(data) {
					//console.log('back from getGroup',data);
					$scope.group = data;
					if (!$scope.group.actors) $scope.group.actors = [];

					$scope.show();
				},genericError
			);
		} else {
			$scope.state = 'create';
			$scope.group = {
				type: 'Team'
				,actors: []
				,instanceId: args.instanceId
				,sys_active: 1
			};

			$scope.show();
		}
	};

	$scope.validate = function() {
		var isValid = true;
		$scope.errordata = {};

		if (!$scope.group.name) {
			isValid = false;
			$scope.errordata.name = "Name is required.";
		}

		if (!$scope.group.type) {
			isValid = false;
			$scope.errordata.type = "Type is required.";
		}

		return isValid;
	};

	$scope.saveGroup = function() {
		if ($scope.validate()) {
			$scope.isSaving = true;

			pfGroupService.saveGroup($scope.group,function(data) {
				//console.log('data back from pfGroupService.saveGroup',data);
				$scope.isSaving = false;
				$rootScope.$broadcast('trigger:admin-group-updated',{id:data.id,type:$scope.state});

				$scope.cancelEdit();
			},genericError);
		}
	};

	$scope.cancelEdit = function() {
		delete $scope.group;
		$scope.state = null;
		$scope.hide();
	};



	$scope.archiveGroup = function(id) {
		pfGroupService.archiveGroup(id,function() {
			$rootScope.$broadcast('trigger:admin-group-updated',{id:id,type:$scope.state});
			$scope.cancelEdit();
		},genericError);
	};

	$scope.restoreGroup = function(id) {
		pfGroupService.restoreGroup(id,function() {
			$rootScope.$broadcast('trigger:admin-group-updated',{id:id,type:$scope.state});
			$scope.cancelEdit();
		},genericError);
	};


	$scope.moveUsersToGroup = function($event) {
		if($event)
			$event.preventDefault();
		angular.forEach($scope.selectedGroupUsers, function(u) {
			$scope.group.actors.push(u);
		});
		$scope.selectedGroupUsers = [];
	};
	$scope.moveUsersFromGroup = function($event) {
		if($event)
			$event.preventDefault();
		angular.forEach($scope.selectedRemoveUsers, function(u) {
			$scope.group.actors.splice($scope.group.actors.indexOf(u),1);
		});
		$scope.selectedRemoveUsers = [];
	};




	$scope.$on('trigger:admin-edit-group',function(evt,args) {
		$scope.startEdit(args);
	});

	$scope.$on('trigger:close-all-modals',function(event,args) {
		$scope.cancelEdit();
	});

}]);
as.directive('groupEditor',[function() {
	return {
		restrict: 'A'
		,scope: true
		,templateUrl: 'partials/app/popups/template-admin-groupEditor.html'
		,controller: 'groupEditorController'
	}
}]);
