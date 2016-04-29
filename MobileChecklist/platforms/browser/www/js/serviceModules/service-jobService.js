var pjm = angular.module('pfJobServices',['pfActorServices','pfSecurityServices','PFuncFirebase','instanceDataModule','pfUI']);

pjm.service('pfJobService',['$rootScope','$popup','pfInstanceService','jobData','pfUserService','pfRightsService','pfStatusService','pfFirebaseAuthService','pfFirebaseData','pfFireSyncService',function($rootScope,$popup,pfInstanceService,jobData,pfUserService,pfRightsService,pfStatusService,pfFirebaseAuthService,pfFirebaseData,pfFireSyncService) {
	var _showDebug = false;

	var _pfJobs = {};

	var _userPrefs;

	pfFirebaseAuthService.onAuth(function() {
		_userPrefs = pfFirebaseData.getUserPrefs();
	});

	var _defaultData = {
		owner: {}
		,followers: []
		,parents: {}
		,children: []
		,flatChildren: {}
		,lastStatusNote: {}
	};

	function pfJob(data) {
		if (_showDebug) {
			console.warn('creating new pfJob');
			if (_defaultData) console.log('defaultData',_defaultData);
			if (data) console.log('data provided as arguments to instantiator',data);
		}
		angular.extend(this,_defaultData);
		angular.extend(this,data);
	}

	pfJob.prototype = {
		$debug: function(data) {
			console.warn('firing debug from pfJob prototype');
			if (data) console.log(data);
			console.log(this);
		}
		,getChildJobType: function() {
			var ct = 'Child Job';
			if (this.summaryData) {
				switch(this.summaryData.sys_entityname) {
					case 'Campaign':
						ct = 'Project';
						break;
					case 'Project':
						ct = 'Task';
						break;
					case 'Task':
						ct = 'Subtask';
						break;
				}
			}
			return ct;
		}
		,$getJobTeam: function(params) {
			params = params || {};
			params.members = params.members || ['owner','followers'];
			params.returnType = params.returnType || 'objects';

			params.returnType = params.returnType.toLowerCase();

			var ret = [];
			var followers = this.followers;
			var owner = this.owner;

			if (params.members.indexOf('owner') > -1) {
				if (owner && owner.email) {
					switch(params.returnType) {
						case "idlist":
							ret.push(owner.id);
							break;
						case "emaillist":
							ret.push(owner.email);
							break;
						case "objects":
							ret.push(angular.copy(owner));
							break;
					}
				}
			}

			if (params.members.indexOf('followers') > -1) {
				for (var i = 0; i < followers.length; i++) {
					var f = followers[i];


					switch(params.returnType) {
						case "idlist":
							if (ret.indexOf(f.id) == -1) {
								ret.push(f.id);
							}
							break;
						case "emaillist":
							if (ret.indexOf(f.email) == -1) {
								ret.push(f.email);
							}
							break;
						case "objects":
							if (!_.find(ret,function(item) { return item.id === f.id; })) {
								ret.push(angular.copy(f));
							}
							break;


					}
				}
			}

			if (params.returnType == 'emaillist') ret = ret.join(';');

			return ret;
		}
		,$loadBasicData: function(cb,ecb) {
			cb = cb || angular.noop;
			ecb = ecb || angular.noop;

			//console.log('firing $loadBasicData for %o',this.id);
			_loadBasicData(this.id,cb,ecb);
			/*this.$loadSummary();
			this.$loadOwner();
			this.$loadFollowers();
			this.$loadLineage();*/
		}

		,$canOpen: function() {
			return _canOpen({id:this.id});
		}
		/*,$loadSplitData: function(cb,ecb) {
			cb = cb || angular.noop;
			ecb = ecb || angular.noop;

			//console.log('firing $loadSplitData for %o',this.id);

			var summary = false;
			var owner = false;
			var followers = false;
			var lineage = false;

			this.$loadSummary(function() {
				summary = true;
				if (summary && owner && followers && lineage) cb({finishedAt:Date.now()}) ;
			});
			this.$loadOwner(function() {
				owner = true;
				if (summary && owner && followers && lineage) cb({finishedAt:Date.now()}) ;
			});
			this.$loadFollowers(function() {
				followers = true;
				if (summary && owner && followers && lineage) cb({finishedAt:Date.now()}) ;
			});
			this.$loadLineage(function() {
				lineage = true;
				if (summary && owner && followers && lineage) cb({finishedAt:Date.now()}) ;
			});
		}*/
		,$loadOwner: function(cb,ecb) {
			_loadOwner(this.id,cb,ecb);
		}
		,$loadFollowers: function(cb,ecb) {
			_loadFollowers(this.id,cb,ecb);
		}

		,$loadLineage: function(cb,ecb) {
			_loadLineage(this.id,cb,ecb);
		}
		,$loadChildren: function(cb,ecb) {
			if (!this.loadingChildren) {
				_loadChildren(this.id,cb,ecb);
			}
		}
		,$updateFamilyTree: function(src) {
			src = src || '$updateFamTree';
			// No callback here, this should be a set-and-forget
			_updateFamilyTree(this.id,src);
		}

		,$saveSummary: function() {
			_pfJobs[this.id] = this;
			console.log('save summary to DB!',this)
		}
		,$loadSummary: function(cb,ecb) {
			_loadSummary(this.id,cb,ecb);
		}

		,$setStartDate: function() {
			console.log('firing $setStartDate in pfJob instance');
		}
		,$setDueDate: function() {
			console.log('firing $setDueDate in pfJob instance');
		}

		/*,$getChildJobEntityName: function(parentEntityName) {
			// TODO: Switch to use this.jobType once we're setting it on summary load
			var ret;
			switch(parentEntityName.toLowerCase()) {
				case "campaign": ret = 'Project'; break;
				case "project": ret = 'Task'; break;
				case "task": ret = 'Subtask'; break;
			}
			return ret;
		}*/

		// TODO: add the below getters and setters
		// $getOwner
		// $setOwner
		// $getFollwers
		// $setFollowers
		// $getSummary
		// $saveSummary

		//	Maybe also the below:
		// $getFiles
		// $addFile
		// $removeFile
		// $getExpenses
		// $addExpense
		// $removeExpense
		// .
	};

	function _loadBasicData(jobId,cb,ecb) {
		//console.log('firing _loadBasicData for %o',jobId);
		cb = cb || angular.noop;
		ecb = ecb || angular.noop;

		var pfJob = _pfJobs[jobId];

		if (!pfJob) {
			$popup.show({
				title: 'An Error Occurred'
				,template: 'Could not find job.'
			});
		}

		pfJob.loadingInfo = true;

		jobData.loadBasicInfo(
			jobId
			,function(data){
				// Owner
				if (data.owner) {
					pfJob.owner = pfUserService.getUserInfo(data.owner);
				}

				// Followers
				pfJob.followers = [];
				if (data.followers) {
					for (var f=0; f < data.followers.length; f++) {
						var fid = data.followers[f];
						pfJob.followers.push(pfUserService.getUserInfo(fid));
					}
				}


				// Lineage
				pfJob.linText = '';
				pfJob.parentId = '';
				if (data.lineage.campaign) pfJob.linText += data.lineage.campaign.name;
				if (data.lineage.project) {
					pfJob.linText += '/' + data.lineage.project.name;
					pfJob.parentId = data.lineage.campaign.id;
				}
				if (data.lineage.task) {
					pfJob.linText += '/' + data.lineage.task.name;
					pfJob.parentId = data.lineage.project.id;
				}
				if (data.lineage.subtask) {
					pfJob.linText += '/' + data.lineage.subtask.name;
					pfJob.parentId = data.lineage.task.id;
				}
				delete data.lineage[data.type.toLowerCase()];
				pfJob.parents = data.lineage;
				pfJob.parentsLoaded = Date.now();

				// Last Status Note
				pfJob.lastStatusNote = data.lastNote;

				// Status Name
				pfJob.statusName = data.status;

				// Summary Data
				if (!pfJob.summaryData) pfJob.summaryData = {};
				var sd = {
					id: data.id
					,name: data.name
					,jobId: data.jobId
					,dueDate: data.dueDate
					,startDate: data.startDate
					,instancePrefix: data.instancePrefix
					,instanceId: data.instanceId
					,sys_active: data.active
					,sys_entityname: data.type
					,jobType: data.type
					,entity_type: data.type.toLowerCase()
					,type: data.type.toLowerCase()
				};
				angular.extend(pfJob.summaryData,sd);

				// Misc data
				pfJob.instanceId = data.instanceId;
				pfJob.active = data.active;


				pfJob.jobLoaded = Date.now();
				pfJob.loadingInfo = false;

				cb(data);
				return data;
			}
			,function(e) {
				pfJob.loadingChildren = false;
				ecb(e);
				console.error('Error loading Owner for job %o',jobId,e);
			}
		);
	}

	function _canOpen(job) {
		var canOpen = false;

		if (pfRightsService.userHasRole('globalAdmin')) {
			return true;
		}

		if (job) {
			//if (job.canOpen) return job.canOpen;

			var theJob = _confirmJobStub(job.id);

			/*if (theJob.canOpen) {
				return theJob.canOpen;
			}*/
			//console.warn('Job',theJob,job);

			var accessByInstance = !pfRightsService.userHasRole('vendor') && (pfInstanceService.instanceId == theJob.instanceId || pfInstanceService.sharedInstances.indexOf(theJob.instanceId) != -1);

			if (accessByInstance) {
				canOpen = true;
				//console.log('instance access');
			} else {
				//console.warn(job.name);
				var jobTeam = theJob.$getJobTeam({returnType:'idList'});
				//console.log('jobTeam compare',pfUserService.currentUser.id,jobTeam);
				if (jobTeam.indexOf(pfUserService.currentUser.id) != -1) {
					canOpen = true;
					//console.log('job team access');
				} else {
					if (theJob.parentId && theJob.parentId.length) {
						//console.log('goto parentJobId',theJob.parentJobId);
						return _canOpen({id:theJob.parentId});
					} else if (job.parentId && job.parentId.length) {
						//console.log('goto parentId',job.parentId);
						return _canOpen({id:job.parentId});
					} else {
						//console.log('no access',theJob);
					}
				}
			}
			/*job.canOpen = canOpen;*/
			job.hasAccess = canOpen;
		}

		return canOpen;

	};


	function _confirmJobStub(id,loadBasicData) {
		if (typeof loadBasicData == 'undefined') loadBasicData = true;

		if (_pfJobs[id]) {
			if (loadBasicData && !_pfJobs[id].jobLoaded) {
				_pfJobs[id].$loadBasicData();
			}
			return _pfJobs[id];

		} else {
			_pfJobs[id] = new pfJob({id:id});

			// Load any data that is essential to always have populated
			if (loadBasicData) _pfJobs[id].$loadBasicData();

			// TODO: loadLastStatusNote(id)

			// Add on any instance specific functions
			_pfJobs[id].debug = function(data) {
				console.warn('firing debug from pfJob instance (added @ confirmJobStub).  ID is %o',id);
				if (data) console.log(data);
				console.log(this);
			};

		}

		return _pfJobs[id];
	}

	function _loadOwner(jobId,cb,ecb) {
		cb = cb || angular.noop;
		ecb = ecb || angular.noop;

		var pfJob = _confirmJobStub(jobId);

		jobData.getOwner(
			jobId
			,function(data){
				pfJob.owner = data;
				pfJob.ownerLoaded = Date.now();
				cb(data);
				return data;
			}
			,function(e) {
				ecb(e);
				console.error('Error loading Owner for job %o',jobId,e);
			}
		);
	}

	function _loadFollowers(jobId,cb,ecb) {
		cb = cb || angular.noop;
		ecb = ecb || angular.noop;

		var pfJob = _confirmJobStub(jobId);

		jobData.getFollowers(
			jobId
			,function(data){
				pfJob.followers = data;
				pfJob.followersLoaded = Date.now();
				cb(data);
				return data;
			}
			,function(e) {
				ecb(e);
				console.error('Error loading Followers for job %o',jobId,e);
			}
		);
	}

	function _loadLineage(jobId,cb,ecb) {
		cb = cb || angular.noop;
		ecb = ecb || angular.noop;

		var pfJob = _confirmJobStub(jobId,false);

		pfJob.loadingLineage = true;
		//console.log('firing _loadLineage for job %o',jobId);
		//console.warn('Should we update lineage for parent jobs here?  if (allPfJobs[data.campaign.id]) { updateChildJobs(data.campaign.id) } ')
		jobData.loadLineage(
			jobId,
			function (data) {
				pfJob.linText = '';
				if (data.campaign) pfJob.linText += data.campaign.name;
				if (data.project) pfJob.linText += '/' + data.project.name;
				if (data.task) pfJob.linText += '/' + data.task.name;
				if (data.subtask) pfJob.linText += '/' + data.subtask.name;

				var ret = angular.extend({},data);
				ret.linText = pfJob.linText;

				if (pfJob.summaryData) {
					var jobType;
					if (data.subtask) {
						jobType = 'Subtask';
					} else if (data.task) {
						jobType = 'Task';
					} else if (data.project) {
						jobType = 'Project'
					} else if (data.campaign) {
						jobType = 'Campaign';
					}

					pfJob.summaryData.entity_type = jobType.toLowerCase();
					pfJob.summaryData.type = jobType.toLowerCase();
					pfJob.summaryData.jobType = jobType;
					pfJob.summaryData.sys_entityname = jobType;
				}

				pfJob.parents = data;
				pfJob.parentsLoaded = Date.now();
				pfJob.loadingLineage = false;
				cb(ret);
			},
			function (e) {
				pfJob.loadingLineage = false;
				console.error('Error loading Lineage for job %o',jobId,e);
				ecb(e);
			}
		);
	}

	function _loadChildren(jobId,cb,ecb) {
		cb = cb || angular.noop;
		ecb = ecb || angular.noop;

		var pfJob = _confirmJobStub(jobId);

		pfJob.loadingChildren = true;

		jobData.loadChildren(
			jobId
			,function(data){
				__modifyDescendantData(data,pfJob.flatChildren);
				pfJob.children = data;
				pfJob.flatChildren = __flattenChildList({},data);
				pfJob.childrenLoaded = Date.now();

				pfJob.loadingChildren = false;

				cb(data);
				return data;
			}
			,function(e) {
				pfJob.loadingChildren = false;
				ecb(e);
				console.error('Error loading Children for job %o',jobId,e);
			}
		);
	}

	function _updateFamilyTree(jobId,src) {
		var pfJob = _confirmJobStub(jobId);
		//console.log('pfJob',pfJob);
		if (!pfJob.parentsLoaded) {
			pfJob.$loadLineage(function () {
				_updateFamilyTree(jobId,'parentLoader');
			})
		} else {
			//console.log('firing _updateFamilyTree for %o',jobId,src);
			if (pfJob.parents.subtask && _pfJobs[pfJob.parents.subtask.id] && _pfJobs[pfJob.parents.subtask.id].childrenLoaded) _pfJobs[pfJob.parents.subtask.id].$loadChildren();
			if (pfJob.parents.task && _pfJobs[pfJob.parents.task.id] && _pfJobs[pfJob.parents.task.id].childrenLoaded) _pfJobs[pfJob.parents.task.id].$loadChildren();
			if (pfJob.parents.project && _pfJobs[pfJob.parents.project.id] && _pfJobs[pfJob.parents.project.id].childrenLoaded) _pfJobs[pfJob.parents.project.id].$loadChildren();
			if (pfJob.parents.campaign && _pfJobs[pfJob.parents.campaign.id] && _pfJobs[pfJob.parents.campaign.id].childrenLoaded) _pfJobs[pfJob.parents.campaign.id].$loadChildren();
		}
	}

	function _loadSummary(jobId,cb,ecb) {
		cb = cb || angular.noop;
		ecb = ecb || angular.noop;

		var pfJob = _confirmJobStub(jobId);

		pfJob.loadingSummary = true;

		jobData.loadSummary(
			jobId,
			function (data) {
				pfJob.summaryData = data;
				pfJob.summaryLoaded = Date.now();
				pfJob.loadingSummary = false;
				cb(data);
			},
			function (e) {
				pfJob.loadingSummary = false;
				console.error('Error loading Job Summary for job %o',jobId,e);
				ecb(e);
			}
		);
	}

	function _saveSummary(input,cb,ecb) {
		cb = cb || angular.noop;
		ecb = ecb || angular.noop;

		jobData.saveSummary(
			input,
			function (data) {
				var pfJob = _confirmJobStub(data.id);

				if (input.owner != pfJob.owner.id) pfJob.$loadOwner();

				// TODO: Write some logic to only reload summary and followers when they have changed.
				pfJob.$loadSummary();
				pfJob.$loadFollowers();
				cb(data);
			},
			function (e) {
				console.error('Error saving Job Summary for job %o',e);
				ecb(e);
			}
		);
	}

	function _setChildOrder(parentId,parentInstanceId,childList,cb) {
		cb = cb || angular.noop;
		//console.warn('firing setChildOrder for %o',parentId,childList);

		var orderData = {};
		for (var i=0; i < childList.length; i++) {
			var item = childList[i];

			orderData[i] = item.id;
		}
		//console.info(orderData);

		$.get('http://192.168.1.5:83/remote2/DragAndDrop.cfc'
			,{
				method: 'setJobOrder'
				,parentId: parentId
				,orderData: JSON.stringify(orderData)
			}
			,function(data) {
				data = $.parseJSON(data);

				//console.log('data back',data);

				var fireSyncPkg = {
					jobId: parentId
					,jobInstanceId: parentInstanceId
					,type: 'reorderChildren'
					,childIds: orderData
				};
				pfFireSyncService.announce(fireSyncPkg);

				cb(data);
			}
		);
	};

	function __modifyDescendantData(data,flatList) {
		for (var i=0; i < data.length; i++) {
			if (flatList && flatList[data[i].id]) {
				data[i].collapsed = !flatList[data[i].id].collapsed;
			} else {
				data[i].collapsed = !_userPrefs.jobWindow.defaultExpandChildJobs;
			}
			data[i].dueDate = new Date(data[i].dueDate);

			if (data[i].children.length) {
				__modifyDescendantData(data[i].children,flatList);
			}
		}
	};

	function __flattenChildList(flatList,childList) {
		flatList = flatList || {};
		for (var i=0; i < childList.length; i++) {
			var job = childList[i];
			flatList[job.id] = job;
			//flatList[job.id].children = [];

			if (job.children) {
				__flattenChildList(flatList,job.children);
			}
		}
		return flatList;
	}

	$rootScope.$on('fireSync-receive:jobCreated',function(evt,args) {
		//console.warn('STUB: job-created in pfJobService',args)
		for (var pfId in _pfJobs) {
			if (pfId == args.parentId || (_pfJobs[pfId].flatChildren[args.parentId])) {
				_loadChildren(pfId)
			}
		}
	});
	$rootScope.$on('fireSync-receive:jobUpdated',function(evt,args) {
		//console.warn('STUB: job-updated in pfJobService',args)
		for (var pfId in _pfJobs) {
			if (pfId == args.jobId) {
				_loadSummary(args.jobId)
			}
		}
	});

	$rootScope.$on('fireSync-receive:jobClosed',function(evt,args) {
		var pfJob = _confirmJobStub(args.jobId);

		pfJob.active = 0;

		if (pfJob.summaryData) {
			pfJob.summaryData.sys_active = 0;
		}

		pfJob.$updateFamilyTree('jobClosed receiver');
	});

	$rootScope.$on('fireSync-receive:jobReopened',function(evt,args) {
		var pfJob = _confirmJobStub(args.jobId);

		pfJob.active = 1;

		if (pfJob.summaryData) {
			pfJob.summaryData.sys_active = 1;
		}

		pfJob.$updateFamilyTree('jobClosed receiver');
	});

	function _addStatusToAncestors(ancestors,data) {
		var levels = ['subtask','task','project','campaign'];

		for (var i in levels) {
			var level = levels[i];

			if (ancestors[level] && ancestors[level].id != data.jobId) {
				var ancId = ancestors[level].id;
				if (_pfJobs[ancId] && _pfJobs[ancId].flatChildren && _pfJobs[ancId].flatChildren[data.jobId]) {
					var childJob = _pfJobs[ancId].flatChildren[data.jobId];

					if (!childJob.relateds) childJob.relateds = {};

					var newNote = {
						author: pfUserService.getUserInfo(data.userId).name
						,date: moment(data.timestamp).format('MMMM Do YYYY, h:mm:ss a')
						,description: data.note
						,noteId: data.noteId
						,status: pfStatusService.getStatusById(data.statusId).name
					};

					childJob.relateds.lastStatusNote = newNote;
				}
			}
		}

	}
	function _updateStatusInAncestors(ancestors,data) {
		var levels = ['subtask','task','project','campaign'];

		for (var i in levels) {
			var level = levels[i];

			if (ancestors[level] && ancestors[level].id != data.jobId) {
				var ancId = ancestors[level].id;
				if (_pfJobs[ancId] && _pfJobs[ancId].flatChildren && _pfJobs[ancId].flatChildren[data.jobId]) {
					var childJob = _pfJobs[ancId].flatChildren[data.jobId];

					if (!(childJob.relateds && childJob.relateds.lastStatusNote)) {
						console.error('lastStatusNote does not exist',childJob.relateds);
					} else {
						var lastNote = childJob.relateds.lastStatusNote;
						if (lastNote.noteId == data.noteId) {

							if (data.changeset.status) {
								lastNote.status = pfStatusService.getStatusById(data.changeset.status.newVal).name;
							}
							if (data.changeset.note) {
								lastNote.description = data.changeset.note.newVal;
							}

							lastNote.date = moment(data.timestamp).format('MMMM Do YYYY, h:mm:ss a');
							lastNote.author = pfUserService.getUserInfo(data.userId).name;

						} else {
							//console.log('Not last note - do not update');
						}
					}
				}
			}
		}
	}

	$rootScope.$on('fireSync-receive:statusNoteAdded',function(evt,args) {
		if (_pfJobs[args.jobId]) {
			var pfJob = _pfJobs[args.jobId];
			var statusObj = pfStatusService.getStatusById(args.statusId);

			pfJob.statusName = statusObj.name;
			if (pfJob.statusNotes) {
				if (_.find(pfJob.statusNotes,function(note) {
						return note.id === args.noteId;
					})) {
					/*var pingData = {
						user: pfUserService.currentUser.name
						,jobName: pfJob.summaryData.name
						,noteData: args
					};
					pfFireSyncService.sendPing('Possible duplicate status note',pingData);*/

					//alert('Please notify Michelle Aran if you see this message. You may see duplicate status notes appear; just close and open the job window to remove them.');
				} else {
					pfJob.statusNotes.push({
						author: pfUserService.getUserInfo(args.userId)
						,description: args.note
						,id: args.noteId
						,sys_active: 1
						,sys_createDate: args.timestamp
						,status: statusObj
					});
				}


			}

			if (pfJob.parents) {
				_addStatusToAncestors(pfJob.parents,args);
			} else {
				_loadLineage(args.jobId,function(data) {
					_addStatusToAncestors(data,args);
				});
			}
		} else {
			//console.log('no pfJob, load lineage');
			_loadLineage(args.jobId,function(data) {
				_addStatusToAncestors(data,args);
			});
		}
	});

	$rootScope.$on('fireSync-receive:statusNoteEdited',function(evt,args) {
		if (_pfJobs[args.jobId]) {
			var pfJob = _confirmJobStub(args.jobId);

			if (pfJob.statusNotes && pfJob.statusNotes.length) {
				var statusNote = _.find(pfJob.statusNotes,function(item) {
					return item.id === args.noteId;
				});

				var cs = args.changeset;

				console.warn('Update note for jobService',statusNote,cs);

				if (cs.note) {
					statusNote.description = cs.note.newVal;
				}
				if (cs.status) {
					statusNote.status = pfStatusService.getStatusById(cs.status.newVal);
				}
				statusNote.author = pfUserService.getUserInfo(args.userId);
				statusNote.sys_updateDate = new Date().toJSON();
			}

			if (pfJob.parents) {
				_updateStatusInAncestors(pfJob.parents,args);
			} else {
				_loadLineage(args.jobId,function(data) {
					_updateStatusInAncestors(data,args);
				});
			}

		} else {
			_loadLineage(args.jobId,function(data) {
				_updateStatusInAncestors(data,args);
			});
		}
	});

	$rootScope.$on('fireSync-receive:statusNoteRemoved',function(evt,args) {
		if (_pfJobs[args.jobId]) {
			var pfJob = _pfJobs[args.jobId];

			if (pfJob.statusNotes.length) {
				/*var statusNote = _.find(pfJob.statusNotes,function(item) {
					return item.id === args.noteId;
				});*/

				pfJob.statusNotes = pfJob.statusNotes.filter(function(item) {
					return item.id !== args.noteId;
				});

				console.warn('Need to write remove note for jobService');
			}
		}
	});


	/*$rootScope.$on('trigger:job-moved',function(evt,args) {
		var pfJob = _confirmJobStub(args.jobId);
		pfJob.parentsLoaded = false;  // Set the parentsLoaded flag to false to force a reload of the lineage data
		pfJob.$updateFamilyTree('trigger:job-moved');
	});*/

	/*$rootScope.$on('trigger:update-jobRelated-notes',function(evt,args) {
		console.warn('replace this with fireSync-receive:jobClosed and jobReopened');
		var pfJob = _confirmJobStub(args.jobId);
		pfJob.$updateFamilyTree('trigger:update-jobRelated-notes');
	});*/

	$rootScope.$on('trigger:update-job-lineage',function(evt,args) {
		console.warn('replace this with fireSync-receive:jobClosed and jobReopened.  See if it makes sense to have the lineageList directive handle it instead');
		//console.log('firing lineage trigger',args);
		var pfJob = _confirmJobStub(args.jobId);
		//pfJob.$loadChildren();
		pfJob.$updateFamilyTree('trigger:update-job-lineage');
	});

	return {
		allJobs: _pfJobs
		,newJobStub: function() {
			return new pfJob();
		}
		,confirmJobStub: _confirmJobStub
		,loadOwner: _loadOwner
		,loadFollowers: _loadFollowers
		,loadSummaryForJob: _loadSummary
		,saveSummaryForJob: _saveSummary
		,loadLineageForJob: _loadLineage
		,loadChildrenForJob: _loadChildren
		,canOpen: _canOpen
		,setChildOrder: _setChildOrder
	};
}]);

pjm.service('jobData',['$resource','$q',function($resource,$q) {
	var jobResource = $resource(
		'http://192.168.1.5:83/api/jobData.cfc'
		,{}
		,{
			getFollowers: {
				method: 'GET',
					isArray: true,
					params: {
					method: 'getFollowers'
				}
			}
			,getOwner: {
				method: 'GET',
				isArray: false,
				params: {
					method: 'getOwner'
				}
			}
			,getJobSummary: {
				method: 'GET',
				isArray: false,
				params: {
					method: 'getJobSummary'
				}
			}
			,saveSummary: {
				method: 'POST',
				params: {
					method: 'saveJobSummary'
				}
			}
			,getLineage: {
				method: 'GET',
				isArray: false,
				params: {
					method: 'getLineage'
				}
			}
			,getChildren: {
				method: 'GET',
				isArray: true,
				params: {
					method: 'getChildren'
				}
			}
			,getBasicInfo: {
				method: 'GET',
				isArray: false,
				params: {
					method: 'getBasicInfo'
				}
			}
		}
	);

	/*var jobFacade = $resource(
		'remote2/JobFacade.cfc',
		{},
		{
			getChildren: {
				method: 'GET',
				isArray: true,
				params: {
					method: 'getChildren'
				}
			},
			getUpdatedChildInfo: {
				method: 'GET',
				isArray: false,
				params: {
					method: 'getUpdatedChildInfo'
				}
			}
			,


			/!*  KNOWN GOOD ABOVE THIS LINE, TO BE EVALUATED BELOW IT  *!/

			getCampaign: {
				method: 'GET',
				isArray: true,
				params: {
					method: 'getCampaign'
				}
			},
			/!*getJob: {
			 method: 'GET',
			 isArray: false,
			 params: {
			 method: 'getJob',
			 active: 'all'
			 }
			 },*!/
			cloneJob: {
				method: 'GET',
				isArray: false,
				params: {
					method: 'cloneJob'
				}
			},
			getChildJobs: {
				method: 'GET',
				isArray: true,
				params: {
					method: 'getChildJobs'
				}
			},
			search: {
				method: 'GET',
				params: {
					method: 'searchJobs'
				}
			},
			save: {
				method: 'POST',
				params: {
					method: 'saveJob'
				}
			},
			add: {
				method: 'POST',
				params: {
					method: 'saveJob',
					returnSerialized: true
				}
			}/!*,
		 addFiles: {
		 method: 'POST',
		 isArray: true,
		 params: {
		 method: 'addFiles'
		 }
		 }*!/
		}
	);*/

	return {
		getFollowers: function (id, cb, ecb) {
			cb = cb || angular.noop;
			ecb = ecb || angular.noop;

			var deferred = $q.defer();
			jobResource.getFollowers(
				{jobId: id},
				function (data) {
					deferred.resolve(data);
					cb(data);
				},
				function (e) {
					deferred.reject(e);
					ecb(e);
				}
			);
			return deferred.promise;
		}
		,getOwner: function (id, cb, ecb) {
			cb = cb || angular.noop;
			ecb = ecb || angular.noop;

			var deferred = $q.defer();
			jobResource.getOwner(
				{jobId: id},
				function (data) {
					deferred.resolve(data);
					cb(data);
				},
				function (e) {
					deferred.reject(e);
					ecb(e);
				}
			);
			return deferred.promise;
		}
		,loadSummary: function(id,cb,ecb) {
			cb = cb || angular.noop;
			ecb = ecb || angular.noop;

			var deferred = $q.defer();
			jobResource.getJobSummary(
				{jobId: id},
				function (data) {
					deferred.resolve(data);
					cb(data);
				},
				function (e) {
					deferred.reject(e);
					ecb(e);
				}
			);
			return deferred.promise;
		}
		,saveSummary: function(data,cb,ecb) {
			cb = cb || angular.noop;
			ecb = ecb || angular.noop;

			var deferred = $q.defer();
			jobResource.saveSummary(
				data,
				function (data) {
					deferred.resolve(data);
					cb(data);
				},
				function (e) {
					deferred.reject(e);
					ecb(e);
				}
			);
			return deferred.promise;
		}
		,loadLineage: function(id,cb,ecb) {
			cb = cb || angular.noop;
			ecb = ecb || angular.noop;

			var deferred = $q.defer();
			jobResource.getLineage(
				{jobId: id},
				function (data) {
					deferred.resolve(data);
					cb(data);
				},
				function (e) {
					deferred.reject(e);
					ecb(e);
				}
			);
			return deferred.promise;
		}
		,loadChildren: function(id,cb,ecb) {
			cb = cb || angular.noop;
			ecb = ecb || angular.noop;

			var deferred = $q.defer();
			jobResource.getChildren(
				{jobId: id},
				function (data) {
					deferred.resolve(data);
					cb(data);
				},
				function (e) {
					deferred.reject(e);
					ecb(e);
				}
			);
			return deferred.promise;
		}
		,loadBasicInfo: function(id,cb,ecb) {
			cb = cb || angular.noop;
			ecb = ecb || angular.noop;

			var deferred = $q.defer();
			jobResource.getBasicInfo(
				{jobId: id},
				function (data) {
					deferred.resolve(data);
					cb(data);
				},
				function (e) {
					deferred.reject(e);
					ecb(e);
				}
			);
			return deferred.promise;
		}
	}
}]);

pjm.service('pfCampaignService',['$resource','$q',function($resource,$q) {
	/*var _allCampaigns = [];
	var _activeCampaigns = [];*/

	var campResource = $resource(
		'http://192.168.1.5:83/api/jobData.cfc',
		{},
		{
			get: {
				method: 'GET',
				params: {
					method: 'getCampaigns'
				}
			},
			list: {
				method: 'GET',
				isArray: true,
				params: {
					method: 'listCampaigns'
				}
			},
			save: {
				method: 'POST',
				params: {
					method: 'saveCampaign'
				}
			},
			archive: {
				method: 'GET',
				params: {
					method: 'archiveCampaign'
				}
			},
			restore: {
				method: 'GET',
				params: {
					method: 'restoreCampaign'
				}
			}
		}
	)

	return {
		// getCampaign retrieves a specific campaign
		getCampaign: function(id,cb,ecb) {
			cb = cb || angular.noop;
			ecb = ecb || angular.noop;

			var deferred = $q.defer();
			campResource.get(
				{id: id},
				function (data) {
					deferred.resolve(data);
					cb(data);
				},
				function (e) {
					deferred.reject(e);
					ecb(e);
				}
			);
			return deferred.promise;
		}
		// getAllCampaigns returns all campaigns regardless of instance
		,getAllCampaigns: function(cb,ecb) {
			cb = cb || angular.noop;
			ecb = ecb || angular.noop;

			var deferred = $q.defer();
			campResource.get(
				{},
				function (data) {
					deferred.resolve(data);
					cb(data);
				},
				function (e) {
					deferred.reject(e);
					ecb(e);
				}
			);
			return deferred.promise;
		}
		// listCampaigns returns all campaigns for the user's currently-accessible instances
		,listCampaigns: function(cb,ecb) {
			cb = cb || angular.noop;
			ecb = ecb || angular.noop;

			var deferred = $q.defer();
			campResource.list(
				function (data) {
					deferred.resolve(data);
					cb(data);
				},
				function (e) {
					deferred.reject(e);
					ecb(e);
				}
			);
			return deferred.promise;
		}
		// listCampaignsForInstance returns all the campaigns for a specified instance
		,listCampaignsForInstance: function(instanceId,cb,ecb) {
			cb = cb || angular.noop;
			ecb = ecb || angular.noop;

			var deferred = $q.defer();
			campResource.list(
				{instanceId: instanceId}
				,function (data) {
					deferred.resolve(data);
					cb(data);
				},
				function (e) {
					deferred.reject(e);
					ecb(e);
				}
			);
			return deferred.promise;
		}
		,saveCampaign: function(input,cb,ecb) {
			cb = cb || angular.noop;
			ecb = ecb || angular.noop;

			var deferred = $q.defer();
			campResource.save(
				input,
				function (data) {
					deferred.resolve(data);
					cb(data);
				},
				function (e) {
					deferred.reject(e);
					ecb(e);
				}
			);
			return deferred.promise;
		}
		,archiveCampaign: function(id,cb,ecb) {
			cb = cb || angular.noop;
			ecb = ecb || angular.noop;

			var deferred = $q.defer();
			campResource.archive(
				{id: id},
				function (data) {
					deferred.resolve(data);
					cb(data);
				},
				function (e) {
					deferred.reject(e);
					ecb(e);
				}
			);
			return deferred.promise;
		}
		,restoreCampaign: function(id,cb,ecb) {
			cb = cb || angular.noop;
			ecb = ecb || angular.noop;

			var deferred = $q.defer();
			campResource.restore(
				{id: id},
				function (data) {
					deferred.resolve(data);
					cb(data);
				},
				function (e) {
					deferred.reject(e);
					ecb(e);
				}
			);
			return deferred.promise;
		}

		/*,allCampaigns: _allCampaigns
		,activeCampaigns: _activeCampaigns*/
	}
}]);

pjm.service('pfStatusService',['$resource','$q',function($resource,$q) {

	var statusResource = $resource(
		'http://192.168.1.5:83/api/statusData.cfc'
		,{}
		,{
			getStatuses: {
				method: 'GET'
				,isArray: true
				,params: {
					method: 'getStatuses'
				}
			}
		}
	);

	var _allStatuses = [];
	var _activeStatuses = [];
	var _statusesLoaded = false;

	function _getStatusGroupName(group) {
		switch(group) {
			case 'common':
				group = 'Common Statuses';
				break;
			case 'design':
				group = 'Specialty Statuses';
				break;
		}
		return group;
	}

	function _getStatusById(statusId,activeOnly) {
		activeOnly = activeOnly || false;
		var statusList = activeOnly ? _activeStatuses : _allStatuses;
		return _.find(statusList,function(item) {
			return item.id === statusId;
		});
	}

	return {
		allStatuses: _allStatuses
		,activeStatuses: _activeStatuses
		,statusesLoaded: _statusesLoaded
		,loadStatuses: function(cb,ecb) {
			cb = cb || angular.noop;
			ecb = ecb || angular.noop;

			statusResource.getStatuses(
				{}
				,function(data){
					_allStatuses.length = 0;
					_activeStatuses.length = 0;

					angular.forEach(data,function(item) {
						var ed = JSON.parse(item.extendedData);
						item.state = ed.state;
						item.group = _getStatusGroupName(ed.group);

						_allStatuses.push(item);
						if (item.sys_active) {
							_activeStatuses.push(item);
						}
					});

					_statusesLoaded = true;

					cb(data);
					return data;
				}
				,function(e) {
					ecb(e);
					console.log('Error getting job children',e);
				}
			);
		}
		,getStatusById: _getStatusById
		// TODO: Status Management Functions for Admins
	}

}]);



pjm.controller('campaignEditorController',['$scope','$element','$rootScope','$popup','pfInstanceService','pfCampaignService',function($scope,$element,$rootScope,$popup,pfInstanceService,pfCampaignService) {
	$scope.controllerName = "campaignEditorController";
	$scope.debugMode = true;
	$scope.state = null;

	pfInstanceService.getInstances(function(data) {
		angular.forEach(data,function(item) {
			item.itemName = item.prefix + ' - ' + item.name;
		});
		$scope.instances = data;
	},genericError);

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

	$scope.startEdit = function(id,instanceId) {
		instanceId = instanceId || pfInstanceService.instanceId;

		if (id) {
			$scope.state = 'update';
			pfCampaignService.getCampaign(
				id
				,function(data) {
					$scope.campaign = data;

					$scope.show();
				},genericError
			);
		} else {
			$scope.state = 'create';
			$scope.campaign = {
				instanceId: instanceId
				,sys_active: 1
			};

			$scope.show();
		}
	};

	$scope.validate = function() {
		var isValid = true;
		$scope.errordata = {};

		if (!$scope.campaign.name) {
			isValid = false;
			$scope.errordata.name = "Campaign name is required.";
		}

		if (!$scope.campaign.description) {
			isValid = false;
			$scope.errordata.description = "Description is required.";
		}

		return isValid;
	};

	$scope.saveCampaign = function() {
		if ($scope.validate()) {
			$scope.isSaving = true;

			pfCampaignService.saveCampaign($scope.campaign,function(data) {
				//console.log('data back from pfUserService.saveUser',data);
				$scope.isSaving = false;
				$rootScope.$broadcast('trigger:admin-campaign-updated',{id:data.id,type:$scope.state});
				$rootScope.$broadcast('trigger:sync-job-data',{jobId:data.id});;
				$scope.cancelEdit();
			},function(error) {
				$popup.show({
					title: 'An Error Occurred'
					,template: error.statusText
				});
				//console.log('uh oh',error);
			});
		}
	};

	$scope.cancelEdit = function() {
		delete $scope.campaign;
		$scope.state = null;
		$scope.hide();
	};



	$scope.archiveCampaign = function(id) {
		pfCampaignService.archiveCampaign(id,function() {
			$rootScope.$broadcast('trigger:admin-campaign-updated',{id:id,type:$scope.state});
			$rootScope.$broadcast('trigger:sync-job-data',{jobId:id});
			$scope.cancelEdit();
		},genericError);
	};

	$scope.restoreCampaign = function(id) {
		pfCampaignService.restoreCampaign(id,function() {
			$rootScope.$broadcast('trigger:admin-campaign-updated',{id:id,type:$scope.state});
			$rootScope.$broadcast('trigger:sync-job-data',{jobId:id});
			$scope.cancelEdit();
		},genericError);
	};

	$scope.$on('trigger:admin-edit-campaign',function(evt,args) {
		$scope.startEdit(args.id,args.instanceId);
	});

	$scope.$on('trigger:close-all-modals',function(event,args) {
		$scope.cancelEdit();
	});

}]);
pjm.directive('campaignEditor',[function() {
	return {
		restrict: 'A'
		,scope: true
		,templateUrl: 'partials/app/popups/template-admin-campaignEditor.html'
		,controller: 'campaignEditorController'
	}
}]);


pjm.controller('CampaignAdminController',['$scope','$rootScope','pfCampaignService','pfUtils',function($scope,$rootScope,pfCampaignService,pfUtils) {

	$scope.sortColumn = pfUtils.sortColumn;
	$scope.sort = {column:['instancePrefix','name']};

	$scope.init = function() {
		$scope.campaignFilter = {};
		$scope.campaignFilter.sys_active = 1;

		$scope.selectedCampaign = null;

		$scope.loadCampaigns();
	};


	$scope.selectedCampaignClass = function(campaign) {
		return {
			info: $scope.selectedCampaign === campaign
		}
	};


	$scope.loadCampaigns = function() {
		pfCampaignService.listCampaigns(function(data) {
			$scope.campaigns = data;
		});
	};

	$scope.addCampaign = function () {
		$rootScope.$broadcast('trigger:admin-edit-campaign',{});
	};

	$scope.editCampaign = function(campaign) {
		$rootScope.$broadcast('trigger:admin-edit-campaign',{id:campaign.id});
	};

	$scope.$on('trigger:admin-campaign-updated',function(evt,args) {
		$scope.loadCampaigns();
	});

	$scope.init();

}]);
