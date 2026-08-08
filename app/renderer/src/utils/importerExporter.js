/**
 * Importer / Exporter Utility
 * 
 * Utility for parsing and generating JSON export files:
 * - Supports Testly Collection JSON
 * - Supports Postman Collection v2.1 JSON format
 * - Supports Testly Environment JSON
 * - Supports Full Testly Backup JSON
 */

/**
 * Trigger browser file download for JSON data
 */
export const downloadJsonFile = (filename, contentObject) => {
  const jsonStr = JSON.stringify(contentObject, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Export a single Testly Collection
 */
export const exportCollection = (collection) => {
  const sanitizeName = (collection.name || 'collection').replace(/[^a-z0-9_-]/gi, '_');
  const exportData = {
    type: 'testly_collection',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    collection: {
      name: collection.name,
      requests: (collection.requests || []).map(r => ({
        name: r.name,
        method: r.method || 'GET',
        url: r.url || '',
        headers: r.headers || [],
        params: r.params || [],
        body: r.body || { activeType: 'none', json: '{\n  \n}', formdata: [], raw: '' },
        auth: r.auth || { type: 'none', data: {} },
      })),
    },
  };
  downloadJsonFile(`${sanitizeName}.testly.json`, exportData);
};

/**
 * Export a single Environment profile
 */
export const exportEnvironment = (environment) => {
  const sanitizeName = (environment.name || 'environment').replace(/[^a-z0-9_-]/gi, '_');
  const exportData = {
    type: 'testly_environment',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    environment: {
      name: environment.name,
      variables: environment.variables || [],
    },
  };
  downloadJsonFile(`${sanitizeName}.env.json`, exportData);
};

/**
 * Convert Postman v2.1 Collection JSON to Testly Collection format
 */
const convertPostmanToTestly = (postmanJson) => {
  const collectionName = postmanJson.info?.name || 'Postman Collection';
  const requests = [];

  const extractItems = (items) => {
    if (!Array.isArray(items)) return;

    items.forEach(item => {
      if (item.request) {
        // Parse Method
        const method = (typeof item.request === 'string' ? 'GET' : item.request.method) || 'GET';

        // Parse URL
        let url = '';
        if (typeof item.request.url === 'string') {
          url = item.request.url;
        } else if (item.request.url && typeof item.request.url === 'object') {
          url = item.request.url.raw || '';
        }

        // Parse Headers
        const headers = Array.isArray(item.request.header)
          ? item.request.header.map(h => ({
              id: crypto.randomUUID(),
              key: h.key || '',
              value: h.value || '',
              enabled: h.disabled !== true,
            }))
          : [];

        // Parse Query Params
        let params = [];
        if (item.request.url && Array.isArray(item.request.url.query)) {
          params = item.request.url.query.map(p => ({
            id: crypto.randomUUID(),
            key: p.key || '',
            value: p.value || '',
            enabled: p.disabled !== true,
          }));
        }

        // Parse Body
        const body = {
          activeType: 'none',
          json: '{\n  \n}',
          formdata: [],
          raw: '',
        };

        if (item.request.body) {
          const mode = item.request.body.mode;
          if (mode === 'raw') {
            body.activeType = 'json';
            body.json = item.request.body.raw || '{\n  \n}';
            body.raw = item.request.body.raw || '';
          } else if (mode === 'formdata' && Array.isArray(item.request.body.formdata)) {
            body.activeType = 'formdata';
            body.formdata = item.request.body.formdata.map(f => ({
              id: crypto.randomUUID(),
              key: f.key || '',
              value: f.value || '',
              enabled: f.disabled !== true,
            }));
          } else if (mode === 'urlencoded' && Array.isArray(item.request.body.urlencoded)) {
            body.activeType = 'formdata';
            body.formdata = item.request.body.urlencoded.map(f => ({
              id: crypto.randomUUID(),
              key: f.key || '',
              value: f.value || '',
              enabled: f.disabled !== true,
            }));
          }
        }

        // Parse Auth
        const auth = { type: 'none', data: {} };
        if (item.request.auth) {
          const type = item.request.auth.type;
          if (type === 'bearer' && Array.isArray(item.request.auth.bearer)) {
            const tokenObj = item.request.auth.bearer.find(b => b.key === 'token');
            auth.type = 'bearer';
            auth.data = { token: tokenObj?.value || '' };
          } else if (type === 'basic' && Array.isArray(item.request.auth.basic)) {
            const userObj = item.request.auth.basic.find(b => b.key === 'username');
            const passObj = item.request.auth.basic.find(b => b.key === 'password');
            auth.type = 'basic';
            auth.data = { username: userObj?.value || '', password: passObj?.value || '' };
          }
        }

        requests.push({
          name: item.name || 'Untitled Request',
          method,
          url,
          headers,
          params,
          body,
          auth,
        });
      }

      // Handle nested folders in Postman collection
      if (Array.isArray(item.item)) {
        extractItems(item.item);
      }
    });
  };

  extractItems(postmanJson.item || []);

  return {
    name: collectionName,
    requests,
  };
};

/**
 * Parse an imported JSON string and return categorized import payload
 * @param {string} jsonString - Content of imported file
 * @returns {Object} { type: 'collection'|'environment'|'postman'|'unknown', data: Object, name: string, summary: string }
 */
export const parseImportPayload = (jsonString) => {
  let parsed;
  try {
    parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
  } catch (e) {
    throw new Error('Invalid JSON format: Unable to parse file content');
  }

  // 1. Postman Collection v2.1
  if (parsed?.info?.schema?.includes('postman') || (parsed?.info && Array.isArray(parsed?.item))) {
    const converted = convertPostmanToTestly(parsed);
    return {
      type: 'postman',
      name: converted.name,
      requestCount: converted.requests.length,
      summary: `Postman Collection v2.1: "${converted.name}" (${converted.requests.length} requests)`,
      data: converted,
    };
  }

  // 2. Testly Collection Format
  if (parsed?.type === 'testly_collection' || (parsed?.collection?.name && Array.isArray(parsed?.collection?.requests))) {
    const col = parsed.collection || parsed;
    return {
      type: 'collection',
      name: col.name,
      requestCount: col.requests?.length || 0,
      summary: `Testly Collection: "${col.name}" (${col.requests?.length || 0} requests)`,
      data: col,
    };
  }

  // 3. Testly Environment Format
  if (parsed?.type === 'testly_environment' || (parsed?.environment?.name && Array.isArray(parsed?.environment?.variables))) {
    const env = parsed.environment || parsed;
    return {
      type: 'environment',
      name: env.name,
      variableCount: env.variables?.length || 0,
      summary: `Environment Profile: "${env.name}" (${env.variables?.length || 0} variables)`,
      data: env,
    };
  }

  // 4. Raw object fallback if matches request structure
  if (parsed?.name && (Array.isArray(parsed?.requests) || Array.isArray(parsed?.variables))) {
    if (Array.isArray(parsed?.requests)) {
      return {
        type: 'collection',
        name: parsed.name,
        requestCount: parsed.requests.length,
        summary: `Collection: "${parsed.name}" (${parsed.requests.length} requests)`,
        data: parsed,
      };
    } else {
      return {
        type: 'environment',
        name: parsed.name,
        variableCount: parsed.variables.length,
        summary: `Environment Profile: "${parsed.name}" (${parsed.variables.length} variables)`,
        data: parsed,
      };
    }
  }

  throw new Error('Unrecognized JSON structure. Supported formats: Postman v2.1 Collection, Testly Collection, Testly Environment.');
};
