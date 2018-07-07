import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotProp from 'dot-prop';

import { ValidationError, ArgumentError } from 'auth0-extension-tools';


export function keywordReplace(input, mappings) {
  if (mappings && Object.keys(mappings).length > 0) {
    Object.keys(mappings).forEach(function(key) {
      const re = new RegExp(`##${key}##`, 'g');
      input = input.replace(re, mappings[key]);
    });

    Object.keys(mappings).forEach(function(key) {
      const re = new RegExp(`@@${key}@@`, 'g');
      input = input.replace(re, JSON.stringify(mappings[key]));
    });
  }
  return input;
}

export function loadFile(file, mappings) {
  const f = path.resolve(file);
  try {
    fs.accessSync(f, fs.F_OK);
    if (mappings) {
      return keywordReplace(fs.readFileSync(f, 'utf8'), mappings);
    }
    return fs.readFileSync(f, 'utf8');
  } catch (error) {
    throw new Error(`Unable to load file ${f} due to ${error}`);
  }
}

export function generateChecksum(data) {
  if (typeof data !== 'string') {
    throw new ArgumentError('Must provide data as a string.');
  }

  return crypto.createHash('sha256').update(data).digest('hex');
}

export function parseJsonFile(fileName, contents, mappings) {
  let json = contents;
  try {
    /* if mappings is defined, replace contents before parsing */
    json = keywordReplace(contents, mappings);
    return JSON.parse(json);
  } catch (e) {
    throw new ValidationError('Error parsing JSON from metadata file: ' + fileName + ', because: ' + e.message + ', contents: ' + contents + ', post-replace: ' + json);
  }
}

export function checksumReplacer(exclusions) {
  exclusions = exclusions || [];
  if (typeof exclusions === 'string') {
    exclusions = [ exclusions ];
  }

  return function(key, value) {
    if (exclusions.indexOf(key) > -1 && typeof value === 'string') {
      return generateChecksum(value);
    }

    return value;
  };
}

export function flatten(list) {
  return list.reduce((a, b) => a.concat(Array.isArray(b) ? flatten(b) : b), []);
}

export function dumpJSON(obj, spacing = 0) {
  return JSON.stringify(obj, null, spacing);
}

export function arrayToObject(array, keyField = 'name') {
  return array.reduce((obj, item) => {
    obj[item[keyField]] = item;
    return obj;
  }, {});
}

export function calcChanges(assets, existing, identifiers = [ 'id', 'name' ]) {
  const update = [];
  let del = [ ...existing ];
  let create = [ ...assets ];
  const conflicts = [];

  const findByKeyValue = (key, value, arr) => arr.filter(e => e[key] === value)[0];

  const processAssets = (id, arr) => {
    arr.forEach((asset) => {
      const assetIdValue = asset[id];
      if (assetIdValue) {
        const found = findByKeyValue(id, assetIdValue, del);
        if (found) {
          // Delete from existing
          del = del.filter(e => e !== found);

          // Delete from create as it's an update
          create = create.filter(e => e !== asset);

          // Append identifiers to asset
          update.push({
            ...identifiers.reduce((obj, i) => {
              if (found[i]) obj[i] = found[i];
              return obj;
            }, {}),
            ...asset
          });
        }
      }
    });
  };

  // Loop through identifiers (in order) to try match assets to existing
  // If existing then update if not create
  // The remainder will be deleted
  for (const id of identifiers) { // eslint-disable-line
    processAssets(id, [ ...create ]);
  }

  // Check if there are assets with names that will conflict with existing names during the update process
  // This will rename those assets to a temp random name first
  // This assumes the first identifiers is the unique identifier
  if (identifiers.includes('name')) {
    const uniqueID = identifiers[0];
    const futureAssets = [ ...create, ...update ];
    futureAssets.forEach((a) => {
      // If the conflicting item is going to be deleted then skip
      const inDeleted = del.filter(e => e.name === a.name && e[uniqueID] !== a[uniqueID])[0];
      if (!inDeleted) {
        const conflict = existing.filter(e => e.name === a.name && e[uniqueID] !== a[uniqueID])[0];
        if (conflict) {
          const temp = Math.random().toString(36).substr(2, 5);
          conflicts.push({
            ...conflict,
            name: `${conflict.name}-${temp}`
          });
        }
      }
    });
  }


  return {
    del,
    update,
    conflicts,
    create
  };
}

export function stripFields(obj, fields) {
  const newObj = { ...obj };
  fields.forEach(f => dotProp.delete(newObj, f));
  return newObj;
}


export function duplicateItems(arr, key) {
  const duplicates = arr.reduce((accum, obj) => {
    const keyValue = obj[key];
    if (keyValue) {
      if (!(keyValue in accum)) accum[keyValue] = [];
      accum[keyValue].push(obj);
    }
    return accum;
  }, {});
  return Object.values(duplicates).filter(g => g.length > 1);
}
