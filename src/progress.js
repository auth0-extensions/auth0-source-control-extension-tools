import logger from './logger';

export default function trackProgress(progressData) {
  const logs = [];
  const log = function(message) {
    logs.push({ date: new Date(), message: message });
    logger.debug(message);
  };

  return {
    id: progressData.id,
    user: progressData.user,
    sha: progressData.sha,
    branch: progressData.branch,
    repository: progressData.repository,
    date: new Date(),
    connectionsUpdated: 0,
    configurables: {
      clients: {
        created: 0,
        updated: 0,
        deleted: 0
      },
      resourceServers: {
        created: 0,
        updated: 0,
        deleted: 0
      },
      connections: {
        created: 0,
        updated: 0,
        deleted: 0
      }
    },
    rulesCreated: 0,
    rulesUpdated: 0,
    rulesDeleted: 0,
    error: null,
    logs: logs,
    log: log
  };
}
