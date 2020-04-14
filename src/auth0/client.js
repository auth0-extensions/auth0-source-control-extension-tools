import { PromisePoolExecutor } from 'promise-pool-executor';
import { flatten } from '../utils';

const API_CONCURRENCY = 3;
// To ensure a complete deployment, limit the API requests generated to be 80% of the capacity
// https://auth0.com/docs/policies/rate-limits#management-api-v2
const API_FREQUENCY_PER_SECOND = 8;

function getEntity(rsp) {
  const found = Object.values(rsp).filter(a => Array.isArray(a));
  if (found.length === 1) {
    return found[0];
  }
  throw new Error('There was an error trying to find the entity within paginate');
}

// Warp around the ManagementClient and detect when requesting specific pages to return all
export default function pagedClient(client) {
  client.pool = new PromisePoolExecutor({
    concurrencyLimit: API_CONCURRENCY,
    frequencyLimit: API_FREQUENCY_PER_SECOND,
    frequencyWindow: 1000 // 1 sec
  });

  return new Proxy(client, {
    get: function(target, name, receiver) {
      if (name in Object.getPrototypeOf(target)) { // assume methods live on the prototype
        return async function(...args) {
          // If the function was called with object params and paginate (entity) then handle pagination
          if (args[0] && typeof args[0] === 'object' && args[0].paginate) {
            const fnName = name;

            // Where the entity data will be collected
            const data = [];

            // Create new args and inject the properties we require for pagination automation
            const newArgs = [ ...args ];
            newArgs[0] = { ...newArgs[0], include_totals: true, page: 0 };

            // Grab data we need from the request then delete the keys as they are only needed for this automation function to work
            const perPage = newArgs[0].per_page || 50;
            newArgs[0].per_page = perPage;
            delete args[0].paginate;

            // Run the first request to get the total number of entity items
            const rsp = await target[fnName](...newArgs);
            data.push(...getEntity(rsp));
            const total = rsp.total || 0;
            const pagesLeft = Math.ceil(total / perPage) - 1;

            // Setup pool to get the rest of the pages
            if (pagesLeft > 0) {
              await client.pool.addEachTask({
                data: Array.from(Array(pagesLeft).keys()),
                generator: (page) => {
                  const pageArgs = [ ...newArgs ];
                  pageArgs[0].page = page + 1;
                  return target[fnName](...pageArgs).then((r) => {
                    data.push(...getEntity(r));
                  });
                }
              }).promise().then(results => data.push(...flatten(results)));
            }
            return data;
          }
          return target[name](...args);
        };
      } // assume instance vars like on the target
      return Reflect.get(target, name, receiver);
    }
  });
}
