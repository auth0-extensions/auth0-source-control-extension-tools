import crypto from 'crypto';
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

export function unifyScripts(data, mappings) {
  /* foreach attribute that ends in file, do a keyword replacement, or stringify it */
  data.forEach((item) => {
    Object.keys(item).forEach((key) => {
      if (key.endsWith('File')) {
        if (typeof item[key] === 'object') {
          item[key] = JSON.stringify(item[key]);
        } else if (item[key]) {
          item[key] = keywordReplace(item[key], mappings);
        }
      }
    });
  });

  return data.reduce((accum, item) => {
    accum[item.name] = item;
    return accum;
  }, {});
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

export function unifyDatabases(data, mappings) {
  return data.map(item => ({
    name: item.name,
    scripts: unifyScripts(item.scripts, mappings)
  }));
}
