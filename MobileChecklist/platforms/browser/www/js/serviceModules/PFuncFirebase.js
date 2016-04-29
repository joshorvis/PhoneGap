var pfFB = angular.module('PFuncFirebase',['firebase','pfActorServices']);




pfFB.factory('FirebaseAuth',['$firebaseAuth',function($firebaseAuth) {
	return $firebaseAuth(firebaseRef);
}]);

pfFB.factory('jwtResource',['$resource',function($resource) {
	return $resource(
		'http://192.168.1.5:83/services2/JWTwrapper.cfc'
		,{}
		,{
			getToken: {
				method: 'GET'
				,isArray: false
				,params: {
					method: 'getToken'
				}
			},
			decodeToken: {
				method: 'GET'
				,isArray: false
				,params: {
					method: 'decodeToken'
				}
			}
		}
	);
}]);
pfFB.service('jwtService',['$q','jwtResource',function($q,jwtResource) {
	this.getToken = function(cb,ecb) {
		cb = cb || angular.noop;
		ecb = ecb || angular.noop;

		var d = $q.defer();

		jwtResource.getToken(
			{}
			,function(data) {
				d.resolve(data);
				cb(data);
			}
			,function(error) {
				d.reject(error);
				ecb(error);
			}
		);

		return d.promise
	};

	this.decodeToken = function(token,cb,ecb) {
		cb = cb || angular.noop;
		ecb = ecb || angular.noop;

		var d = $q.defer();

		jwtResource.decodeToken(
			{token:token}
			,function(data) {
				d.resolve(data);
				cb(data);
			}
			,function(error) {
				d.reject(error);
				ecb(error);
			}
		);

		return d.promise
	}
}]);

pfFB.factory('pfFirebaseData',['$firebaseObject','$firebaseArray','pfUserService','pfFirebaseAuthService',function($firebaseObject,$firebaseArray,pfUserService,pfFirebaseAuthService) {

	function extendedFba(data) {
		data = data || {};

		var defaultExtension = {
			reset: function(itemOrIndex) {
				var key, self;
				self = this;
				key = self.$keyAt(itemOrIndex);
				self.$ref().child(key).once('value', function(snap) {
					self.$$updated(snap);
				})
			}
		};

		var fullExtension = angular.extend({},defaultExtension,data);

		return $firebaseArray.$extend(fullExtension);
	}

	var fba = extendedFba();

	return {
		getJobSyncList: function(list) {
			list = list || 'updatedJobs';
			var fbo = $firebaseObject.$extend({
				$$defaults: {

				}
			});
			return new fbo(firebaseRef.child(list));
		}
		,getUserPrefs: function(prefType) {
			var defaults = {
				appSettings: {
					allowCrossUserSync: true
				}
				,jobWindow: {
					defaultExpandChildJobs: true
					,closeWindowWhenICloseJob: true
					,closeWindowWhenOthersCloseJob: true
				}
				,pfNav: {
					defaultOpen: true
					,slideMainContainer: true
					,mainLeftMargin: 10
					,closeTreeOnClick: true
				}
				,expenseSearch: {
					currGroup: "budgetCode"
					,active: "1"
					,type: 'All'
				}
			};

			if (prefType) {
				var fbo = $firebaseObject;

				if (defaults[prefType]) {
					fbo.$extend({
						$$defaults: defaults[prefType]
					});
				}

				return new fbo(firebaseRef.child('userPrefs').child(pfFirebaseAuthService.firebaseInfo.currentUser).child(prefType));
			} else {
				var fbo = $firebaseObject.$extend({
					$$defaults: defaults
				});
				return new fbo(firebaseRef.child('userPrefs').child(pfFirebaseAuthService.firebaseInfo.currentUser));
			}

		}
		,getOpenWindows: function() {
			return new $firebaseObject(firebaseRef.child('openWindows').child(pfFirebaseAuthService.firebaseInfo.currentUser));
		}
		,getJobReportPrefs: function(reportId) {
			var fbo = $firebaseObject.$extend({
				$$defaults: {
					sortObj: {
						column: ['duedate']
						,revOrder: false
					}
					,statusFilter: {
						selectedStatuses: []
						,includeClosedStatuses: false
					}
					,view: 'table'
				}
			});
			//console.log('getting firebase obj',reportId);
			if (reportId) return new fbo(firebaseRef.child('userPrefs').child(pfFirebaseAuthService.firebaseInfo.currentUser).child('jobReportPrefs').child(reportId));
		}
		,getCalendarPrefs: function(reportId) {
			var fbo = $firebaseObject.$extend({
				$$defaults: {
					showDueDateOnly: false
					,showJobOwners: false
					,eventLimit: 0
					,eventLimitClick: 'popover'
				}
			});

			if (reportId) {
				return new fbo(firebaseRef.child('userPrefs').child(pfFirebaseAuthService.firebaseInfo.currentUser).child('jobReportCalendarPrefs').child(reportId));
			} else {
				return new fbo(firebaseRef.child('userPrefs').child(pfFirebaseAuthService.firebaseInfo.currentUser).child('calendarPrefs'));
			}

		}
		,getExtendedDataList: function(jobId,dataSet,extendedRef) {
			var ref = extendedRef || fba;
			return new ref(firebaseRef.child('extendedJobData').child(dataSet).child(jobId));
		}
		,getExtendedDataObj: function(jobId,dataSet,extendedRef) {
			var ref = extendedRef || $firebaseObject;
			return new ref(firebaseRef.child('extendedJobData').child(dataSet).child(jobId));
		}
		,getSpeakerData: function(jobId) {
			var dueDate = new Date();
			dueDate.setDate(dueDate.getDate() + 10);

			var extendedRef = extendedFba({
				$$defaults: {
					completed: false
					,foo: 'bart'
				}
			});
			return this.getExtendedDataList(jobId,'speakerData',extendedRef);
		}
		,getDefaultSpeakerListItems: function() {
			return fba(firebaseRef.child('defaultSpeakerListItems'));
		}
		,getCalendarDateGroups: function(groupId) {
			if (groupId) {
				return new $firebaseObject(firebaseRef.child('calendarDates').child(groupId));
			} else {
				return new fba(firebaseRef.child('calendarDates'));
			}
		}
		,getCalendarDates: function(groupId,dateId) {
			if (dateId) {
				return new $firebaseObject(firebaseRef.child('calendarDates').child(groupId).child('dates').child(dateId));
			} else {
				return new fba(firebaseRef.child('calendarDates').child(groupId).child('dates'));
			}
		}
		,getExpenseActivity: function(expenseId) {
			if (expenseId) {
				return new $firebaseArray(firebaseRef.child('expenseActivity').orderByChild('expenseId').equalTo(expenseId));
			} else if (expenseId === false) {
				return new $firebaseArray(firebaseRef.child('expenseActivity').limitToLast(5));
			} else {
				return new $firebaseArray(firebaseRef.child('expenseActivity'));
			}
		}
		,getUserSync: function(userId) {
			if (userId) {
				return new $firebaseArray(firebaseRef.child('pfSyncUsers').orderByChild('userId').equalTo(userId));
			} else {
				return new $firebaseArray(firebaseRef.child('pfSyncUsers').limitToLast(5));
			}
		}
		,getJobSync: function(args) {
			if (args) {
				if (args.userId) {
					return new $firebaseArray(firebaseRef.child('pfSyncJobs').orderByChild('userId').equalTo(args.userId));
				} else if (args.jobId) {
					return new $firebaseArray(firebaseRef.child('pfSyncJobs').orderByChild('jobId').equalTo(args.jobId));
				} else if (args.type) {
					return new $firebaseArray(firebaseRef.child('pfSyncJobs').orderByChild('type').equalTo(args.type));
				} else if (args.global) {
					var limit = args.limit ? eval(args.limit) : 100;
					//console.log('limit is %o',limit);
					return new $firebaseArray(firebaseRef.child('pfSyncJobs').limitToLast(limit));
				}
			} else {
				return new $firebaseArray(firebaseRef.child('pfSyncJobs').limitToLast(5));
			}
		}
	}
}]);


pfFB.service('pfFirebaseAuthService',['FirebaseAuth','jwtResource','pfUserService',function(FirebaseAuth,jwtResource,pfUserService) {
	var _firebaseInfo = {
		isLoggedIn: false
		,jwtToken: ''
		,currentUser: ''
		,authData: {}
	};

	function _firebaseLogin() {
		if (!pfUserService.currentUser.id) {
			pfUserService.getCurrentUser(function() {
				_firebaseLogin();
			})
		} else {
			jwtResource.getToken(function(data) {
				//console.log('token from getToken',data);
				_firebaseInfo.jwtToken = data.token;
				FirebaseAuth.$authWithCustomToken(data.token);
			},function(error) {
				console.warn("Throwing error for jwtResource.getToken() from pfFirebaseAuthService.firebaseLogin()");
				error(error);
			});
		}

	}

	function _firebaseLogout() {
		_firebaseInfo.stopLogin = true;
		FirebaseAuth.$unauth();
	}

	this.onAuth = function(loginCallback,logoutCallback) {
		loginCallback = loginCallback || angular.noop;
		logoutCallback = logoutCallback || angular.noop;

		FirebaseAuth.$onAuth(function(authData) {
			if (authData) {
				_firebaseInfo.connected = true;
				_firebaseInfo.currentUser = authData.uid;
				_firebaseInfo.jwtToken = authData.token;
				_firebaseInfo.authData = authData.auth;

				loginCallback(authData);
				//$scope.onFirebaseLogin();

			} else {
				_firebaseInfo.connected = false;
				if (!_firebaseInfo.stopLogin) {
					_firebaseLogin();
				} else {
					logoutCallback();
				}
			}
		});
	};

	this.firebaseInfo = _firebaseInfo;

	this.firebaseLogin = _firebaseLogin;

	this.firebaseLogout = _firebaseLogout;
}]);

pfFB.service('pfFireSyncService',['$rootScope','$popup','$http','pfFirebaseData','pfFirebaseAuthService','pfUserService',function($rootScope,$popup,$http,pfFirebaseData,pfFirebaseAuthService,pfUserService) {

	var _jobSync = pfFirebaseData.getJobSync();
	var _expSync = pfFirebaseData.getExpenseActivity();

	var _openWindows = {};

	pfFirebaseAuthService.onAuth(function() {
		_openWindows = pfFirebaseData.getOpenWindows();
	});

	$rootScope.$on('fireSync:announce',function (evt,args) {
		announce(args);
	});

	this.recordWindowHide = function(winId) {
		if (!_openWindows[winId]) _openWindows[winId] = {};
		_openWindows[winId].hidden = true;
		_openWindows.$save();
	};
	this.recordWindowUnhide = function(winId) {
		if (!_openWindows[winId]) _openWindows[winId] = {};
		_openWindows[winId].hidden = false;
		_openWindows.$save();
	};
	this.recordWindowPosition = function(winId,posData) {
		if (!_openWindows[winId]) _openWindows[winId] = {};
		angular.extend(_openWindows[winId],posData);
		_openWindows.$save();
	};
	this.removeWindowPosition = function(winId) {
		delete _openWindows[winId];
		_openWindows.$save();
	};

	this.announce = function(data) {
		//console.info('pfFireSync:announce: %o',data.type);

		angular.extend(data,{
			timestamp: new Date().toJSON()
			,userId: pfUserService.currentUser.id
		});

		//console.info('writing data for fireSync',data);

		switch(data.type) {
			case "userCreated":
			case "userUpdated":
			case "groupArchived":
			case "groupRestored":

				// Do nothing

				break;

			case "expenseCreated":
			case "expenseUpdated":
			case "expenseArchived":
			case "expenseRestored":
			case "expenseDeducted":

			case "adjustParentEstimate":

			case "expense-createCodeSegment":
			case "expense-updateCodeSegment":
			case "expense-archiveCodeSegment":
			case "expense-restoreCodeSegment":

			case "expense-createVendor":
			case "expense-updateVendor":
			case "expense-addVendorToInstance":
			case "expense-removeVendorFromInstance":
			case "expense-mergeVendor":


				if (!_expSync) {
					console.error('_expSync does not exist');
					if (_backupExpSync) {
						_expSync = _backupExpSync;
						console.warn('_backupExpSync exists, switching over');
					}
				}

				try {
					_expSync.$add(data);
				} catch(e) {
					console.warn('reconnecting to Firebase Expenses...');
					var _backupExpSync = pfFirebaseData.getExpenseActivity();
					_backupExpSync.$add(data);
				}

				break;

			default:
				if (!_jobSync) {
					console.error('_jobSync does not exist');
					if (_backupSync) {
						_jobSync = _backupSync;
						console.warn('_backupSync exists, switching over');
					}
				} else {
					//console.info('_jobSync does exist')
				}

				try {
					_jobSync.$add(data);
				} catch(e) {
					/*$popup.show({
						title: 'An Error Occurred'
						,template: 'Lost connection to Firebase.  This should reconnect automatically, but please confirm that your changes have saved and report any problems to Michelle Aran.'
					});
					console.log(e);*/
					console.warn('reconnecting to Firebase...');
					var _backupSync = pfFirebaseData.getJobSync();
					_backupSync.$add(data);
				}

				break;
			// userArchived
			// userRestored

		}

		/*//console.log('ready to fire sendBroadcast')
		//this.sendBroadcast(data,'announcer');


		// OPTIONS:
		// groupCreated
		// groupUpdated
		// groupArchived
		// groupRestored
		//
		//
		//
		// /
		//*/
	};

	function _defaultBroadcast(dataPak) {
		$rootScope.$broadcast(('fireSync-receive:'+dataPak.type),dataPak);
	}

	this.sendBroadcast = function(dataPak,source) {
		//console.log('sending broadcast from %o',source);
		switch(dataPak.type) {
			case 'reassignParent':
				$rootScope.$broadcast('fireSync-receive:reassignParent',dataPak);
				$rootScope.$broadcast('trigger:update-job-lineage',{jobId:dataPak.jobId});
				break;

			case 'reorderChildren':
				$rootScope.$broadcast('fireSync-receive:reorderChildren',dataPak);
				break;

			case 'jobCreated':
			case 'jobUpdated':
				$rootScope.$broadcast('trigger:update-job-lineage',{jobId:dataPak.jobId});
				_defaultBroadcast(dataPak);
				break;

			case "expenseCreated":
				//console.log('blast exp-added',{expenseId:item.expenseId,jobId:item.expenseJobId})
				$rootScope.$broadcast('fireSync-receive:expenseAdded',{expenseId:dataPak.expenseId,jobId:dataPak.expenseJobId});
				break;

			case "expenseUpdated":
			case "expenseDeducted":
			case "expenseRestored":
			case "expenseArchived":
				//console.log('blast exp-update',{expenseId:item.expenseId,jobId:item.expenseJobId})
				$rootScope.$broadcast('fireSync-receive:expenseUpdated',{expenseId:dataPak.expenseId,jobId:dataPak.expenseJobId});
				break;
				/*console.log('blast exp-remove',{expenseId:item.expenseId,jobId:item.expenseJobId})
				 $rootScope.$broadcast('event:expense-removed',{expenseId:item.expenseId,jobId:item.expenseJobId});
				 break;*/

			case "adjustParentEstimate":
				$rootScope.$broadcast('fireSync-receive:adjustParentEstimate',{expenseId:dataPak.expenseId,newAmount:dataPak.changeSet.expenseAmount.newData})
				break;


			default:
				//console.log('generic broadcast of %o',('fireSync-receive:'+dataPak.type),dataPak);
				_defaultBroadcast(dataPak);
				break;
		}
	};

	this.sendPing = function(subject,data) {
		$http({
			method: 'GET'
			,url: 'http://192.168.1.5:83/api/phoneHome.cfc'
			,params: {
				method: 'pingJorvis'
				,subject: subject
				,data: data
			}
		})
	};

}]);

pfFB.controller('pfFireWatchController',['$scope','$rootScope','pfFirebaseData','pfFirebaseAuthService','pfUserService','pfFireSyncService',function($scope,$rootScope,pfFirebaseData,pfFirebaseAuthService,pfUserService,pfFireSyncService) {

	// Empty objects for Firebase data
	$scope.userPrefs = {};
	$scope.updatedJobs = {};
	$scope.createdJobs = {};
	$scope.userSync = [];

	$scope.expenseActivity = [];

	// Listeners that will update the synced objects

	$scope.$on('event:system-logout',function(evt,args) {
		pfFirebaseAuthService.firebaseLogout();
	});

	$scope.$on('trigger:admin-user-updated',function(evt,args) {
		var fireObj = {
			type: args.type
			,id: args.id
			,data: args.data
		};

		//console.log('firing trigger:admin-user-updated',args,fireObj);

		$scope.userSync.$add(fireObj).then(function(data) {
			//console.log('user fireObj added',data);
		});
	});

	$scope.$on('fireSync-receive:jobClosed',function(evt,args) {
		console.log('receiving jobClosed',args,$scope.userPrefs.jobWindow);
		if ($scope.userPrefs.jobWindow.closeWindowWhenICloseJob && args.userId === pfUserService.currentUser.id) {
			console.log('close my own job');
			$rootScope.$broadcast('trigger:destroy-window',{jobId:args.jobId});
		} else {
			console.log('dont close my own job');
		}
		if ($scope.userPrefs.jobWindow.closeWindowWhenOthersCloseJob && args.userId != pfUserService.currentUser.id) {
			console.log('you can close my job');
			$rootScope.$broadcast('trigger:destroy-window',{jobId:args.jobId});
		} else {
			console.log('dont you close my job');
		}
	});

	pfFirebaseAuthService.onAuth(function(authData) {
		//console.log('firebase logged in');
		_onFirebaseLogin();
	},function() {
		//console.log('firebase logged out');
	});

	function _isJorvis() {
		return pfUserService.currentUser.id === '2c9097d843b2e6250143b2eca90a0040';
	}

	function _watchAndBroadcast(dataNew,dataOld) {
		dataNew = JSON.parse(dataNew);
		dataOld = JSON.parse(dataOld);

		if (_isJorvis()) {
			//console.log('watchAndBroadcast()',dataNew,dataOld);
		}

		//console.log('expAct data change',dataNew,dataOld);

		if (dataNew.length) {
			for (var i=0; i < dataNew.length; i++) {
				var newItem = dataNew[i];
				var itemInOld = _.find(dataOld,function(oldItem) {
					return oldItem.$id === newItem.$id
				});

				if (!itemInOld) {
					pfFireSyncService.sendBroadcast(newItem,'watcher');
				}
			}
		}
	}

	// When a login to firebase is established, start binding data
	function _onFirebaseLogin() {
		pfFirebaseData.getUserPrefs().$bindTo($scope,'userPrefs');

		pfFirebaseData.getExpenseActivity(false).$loaded(function(data) {
			$scope.expenseActivity = data;

			$scope.$watch(
				function() {
					return JSON.stringify($scope.expenseActivity);
				}
				,_watchAndBroadcast
			)
		});

		pfFirebaseData.getJobSync().$loaded(function(data) {
			$scope.jobSync = data;

			$scope.$watch(
				function() {
					return JSON.stringify($scope.jobSync);
				}
				,_watchAndBroadcast
			)
		});

		pfFirebaseData.getUserSync().$loaded(function(data) {
			$scope.userSync = data;

			$scope.$watch(
				function() {
					return JSON.stringify($scope.userSync);
				}
				,function(dataNew,dataOld) {
					dataNew = JSON.parse(dataNew);
					dataOld = JSON.parse(dataOld);


					if (dataNew.length) {
						for (var i=0; i < dataNew.length; i++) {
							var item = dataNew[i];
							var itemInOld = _.find(dataOld,function(oldItem) {
								return oldItem.$id === item.$id
							});

							if (!itemInOld) {
								//console.log('userSync data change',dataNew,dataOld);
								var userInfo = angular.copy(item.data);
								if (userInfo.$$hashKey) delete userInfo.$$hashKey;

								//console.log('userInfo',userInfo);

								var allUser = _.find($scope.allUsers,function(allUser) {
									return allUser.id === userInfo.id;
								});

								if (allUser) {
									angular.extend(allUser,userInfo);
								} else {
									$scope.allUsers.push(userInfo);
								}

								var activeUser = _.find($scope.activeUsers,function(actUser) {
									return actUser.id === userInfo.id;
								});

								switch(item.type) {
									case "create":
									case "update":
									case "restore":
										if (activeUser) {
											angular.extend(activeUser,userInfo);
										} else {
											$scope.activeUsers.push(userInfo);
										}

										break;
									case "archive":
										if (activeUser) {
											$scope.activeUsers.splice($scope.activeUsers.indexOf(activeUser),1);
										}

										break;
								}
							}
						}
					}
				}
			)
		})

	}
}]);




var ___jobDataSyncTemplates = {
	// For reassigning parents:
	reassignParent: {
		jobId: ''
		,jobInstanceId: ''
		,type: 'reassignParent'
		,oldParentId: ''
		,newParentId: ''
		,timestamp: new Date()
		,user: ''
	}
	,reorderChildren: {
		jobId: ''
		,jobInstanceId: ''
		,type: 'reorderChildren'
		,childIds: {
			'0': ''
			,'1': ''
			,'2': ''
		}
		,timestamp: new Date()
		,user: ''
	}
	,jobCreated: {
		jobId: ''
		,jobInstanceId: ''
		,type: 'jobCreated'
		,ownerId: ''
		,followerIds: ['','','']
		,jobType: ''
		,name: ''
	}
	,jobUpdated: {
		jobId: ''
		,jobInstanceId: ''
		,type: 'jobUpdated'
		,changeset: {
			'field': {
				oldVal: ''
				,newVal: ''
			}
		}
	}
	,jobClosed: {
		jobId: ''
		,jobInstanceId: ''
		,type: 'jobClosed'
		,closingStatusId: ''
		,closingStatusNote: ''
	}
	,statusNoteAdded: {
		jobId: ''
		,jobInstanceId: ''
		,type: 'statusNoteAdded'
		,noteId: ''
		,statusId: ''
		,note: ''

	}
	,statusNoteEdited: {
		jobId: ''
		,jobInstanceId: ''
		,type: 'statusNoteEdited'
		,noteId: ''
		,changeset: {
			statusId: {
				oldVal: ''
				,newVal: ''
			}
			,note: {
				oldVal: ''
				,newVal: ''
			}
		}

	}
	,statusNoteRemoved: {
		jobId: ''
		,jobInstanceId: ''
		,type: 'statusNoteRemoved'
		,noteId: ''
	}
	,jobFileAdded: {
		jobId: ''
		,jobInstanceId: ''
		,type: 'jobFileAdded'
		,fileId: ''
		,filename: ''
	}
	,jobFileEdited: {
		jobId: ''
		,jobInstanceId: ''
		,type: 'jobFileEdited'
		,fileId: ''
		,changeset: {
			'field': {
				oldVal: ''
				,newVal: ''
			}
		}
	}
	,jobFileRemoved: {
		jobId: ''
		,jobInstanceId: ''
		,type: 'jobFileRemoved'
		,fileId: ''
	}
	,userLogin: {
		type: 'userLogin'
	}
};


