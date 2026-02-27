/**
 * HTTP Request Executor
 * 
 * Executes HTTP requests using Axios with support for:
 * - All HTTP methods (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
 * - Headers and query params
 * - Multiple body types (JSON, FormData, Raw)
 * - Authentication (Bearer, Basic, API Key)
 * 
 * FIXED: Uses custom DNS lookup to force IPv4 resolution.
 * Many networks have IPv6 connectivity issues while IPv4 works fine.
 */

const axios = require('axios');
const https = require('https');
const http = require('http');
const dns = require('dns');

// Force DNS to resolve IPv4 addresses only
dns.setDefaultResultOrder('ipv4first');

// Create custom agents with IPv4 lookup
const createHttpsAgent = () => new https.Agent({
  family: 4,  // Force IPv4
  keepAlive: true,
  rejectUnauthorized: false,  // Allow self-signed certs
  lookup: (hostname, options, callback) => {
    // Force IPv4 lookup
    dns.lookup(hostname, { family: 4 }, callback);
  },
});

const createHttpAgent = () => new http.Agent({
  family: 4,  // Force IPv4
  keepAlive: true,
  lookup: (hostname, options, callback) => {
    // Force IPv4 lookup
    dns.lookup(hostname, { family: 4 }, callback);
  },
});

const httpsAgent = createHttpsAgent();
const httpAgent = createHttpAgent();

/**
 * Build axios config from our request format
 * @param {Object} request - Our internal request format
 * @returns {Object} Axios config
 */
const buildAxiosConfig = (request) => {
  const config = {
    method: request.method || 'GET',
    url: request.url,
    headers: {},
    timeout: 60000, // 60 second timeout
    
    // Force IPv4
    httpsAgent,
    httpAgent,
    
    // Don't throw on any status code
    validateStatus: () => true,
    
    // Handle large responses
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  };
  
  // Add headers
  if (request.headers && Array.isArray(request.headers)) {
    request.headers.forEach(header => {
      if (header.enabled !== false && header.key) {
        config.headers[header.key] = header.value || '';
      }
    });
  }
  
  // Add query params
  if (request.params && Array.isArray(request.params)) {
    const params = {};
    request.params.forEach(param => {
      if (param.enabled !== false && param.key) {
        params[param.key] = param.value || '';
      }
    });
    config.params = params;
  }
  
  // Add body (only for methods that support it)
  const methodsWithBody = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (methodsWithBody.includes(config.method.toUpperCase()) && request.body) {
    // Support both new format { activeType, json, formdata, raw }
    // and legacy format { type, content }
    let bodyType, bodyContent;
    
    if ('activeType' in request.body) {
      // New format
      bodyType = request.body.activeType;
      if (bodyType === 'json') bodyContent = request.body.json;
      else if (bodyType === 'formdata') bodyContent = request.body.formdata;
      else if (bodyType === 'raw') bodyContent = request.body.raw;
    } else {
      // Legacy format
      bodyType = request.body.type;
      bodyContent = request.body.content;
    }
    
    switch (bodyType) {
      case 'json':
        try {
          config.data = JSON.parse(bodyContent || '{}');
          config.headers['Content-Type'] = 'application/json';
        } catch (e) {
          config.data = bodyContent;
          config.headers['Content-Type'] = 'application/json';
        }
        break;
        
      case 'formdata':
        if (Array.isArray(bodyContent)) {
          const formData = new URLSearchParams();
          bodyContent.forEach(item => {
            if (item.enabled !== false && item.key) {
              formData.append(item.key, item.value || '');
            }
          });
          config.data = formData.toString();
          config.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        }
        break;
        
      case 'raw':
        config.data = bodyContent;
        break;
    }
  }
  
  // Apply authentication
  if (request.auth && request.auth.type !== 'none') {
    applyAuth(config, request.auth);
  }
  
  return config;
};

/**
 * Apply authentication to request config
 */
const applyAuth = (config, auth) => {
  switch (auth.type) {
    case 'bearer':
      if (auth.data?.token) {
        config.headers['Authorization'] = `Bearer ${auth.data.token}`;
      }
      break;
      
    case 'basic':
      if (auth.data?.username) {
        const credentials = Buffer.from(
          `${auth.data.username}:${auth.data.password || ''}`
        ).toString('base64');
        config.headers['Authorization'] = `Basic ${credentials}`;
      }
      break;
      
    case 'apiKey':
      if (auth.data?.key && auth.data?.value) {
        const location = auth.data.location || 'header';
        if (location === 'header') {
          config.headers[auth.data.key] = auth.data.value;
        } else if (location === 'query') {
          config.params = config.params || {};
          config.params[auth.data.key] = auth.data.value;
        }
      }
      break;
  }
};

/**
 * Execute with retry logic
 */
const executeWithRetry = async (request, retryCount = 0) => {
  const MAX_RETRIES = 2;
  
  if (!request.url) {
    throw new Error('URL is required');
  }
  
  // Ensure URL has protocol
  let url = request.url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  
  const requestWithUrl = { ...request, url };
  const config = buildAxiosConfig(requestWithUrl);
  const startTime = Date.now();
  
  try {
    const response = await axios(config);
    const duration = Date.now() - startTime;
    
    return {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data,
      time: duration,
      size: calculateSize(response.data),
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Retry on connection errors
    const retryableErrors = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'ENETUNREACH'];
    if (retryableErrors.includes(error.code) && retryCount < MAX_RETRIES) {
      console.log(`Retrying request (${retryCount + 1}/${MAX_RETRIES}) after ${error.code}...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return executeWithRetry(request, retryCount + 1);
    }
    
    // Network errors
    if (!error.response) {
      let errorMessage = error.message;
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout - the server took too long to respond';
      } else if (error.code === 'ECONNRESET') {
        errorMessage = 'Connection reset - try again';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = 'Connection timeout - could not reach the server';
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Connection refused - server not accepting connections';
      } else if (error.code === 'ENOTFOUND') {
        errorMessage = 'Server not found - check the URL';
      } else if (error.code === 'ENETUNREACH') {
        errorMessage = 'Network unreachable - check your internet connection';
      }
      
      throw new Error(errorMessage);
    }
    
    // HTTP error response
    return {
      status: error.response.status,
      statusText: error.response.statusText,
      headers: error.response.headers,
      data: error.response.data,
      time: duration,
      size: calculateSize(error.response.data),
      isError: true,
    };
  }
};

const execute = async (request) => {
  return executeWithRetry(request, 0);
};

const calculateSize = (data) => {
  if (data === null || data === undefined) return 0;
  if (typeof data === 'string') {
    return new TextEncoder().encode(data).length;
  }
  return new TextEncoder().encode(JSON.stringify(data)).length;
};

module.exports = { execute };
