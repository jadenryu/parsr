#!/usr/bin/env node

/**
 * Test script to validate ngrok connection to FastAPI backend
 * Usage: node test_ngrok_connection.js <ngrok-url>
 * Example: node test_ngrok_connection.js https://abc123.ngrok.io
 */

const https = require('https');
const http = require('http');

async function testConnection(baseUrl) {
    console.log(`🧪 Testing connection to: ${baseUrl}\n`);

    const tests = [
        { endpoint: '/health', description: 'Health check endpoint' },
        { endpoint: '/docs', description: 'API documentation' },
        { endpoint: '/', description: 'Root endpoint' }
    ];

    for (const test of tests) {
        try {
            console.log(`Testing ${test.description} (${test.endpoint})...`);

            const url = `${baseUrl}${test.endpoint}`;
            const isHttps = url.startsWith('https');
            const client = isHttps ? https : http;

            const response = await new Promise((resolve, reject) => {
                const req = client.get(url, {
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'ngrok-test-script'
                    }
                }, resolve);

                req.on('error', reject);
                req.on('timeout', () => {
                    req.destroy();
                    reject(new Error('Request timeout'));
                });
            });

            console.log(`  ✅ Status: ${response.statusCode} ${response.statusMessage}`);

            if (test.endpoint === '/health') {
                // Read response body for health check
                let body = '';
                response.on('data', chunk => body += chunk);
                response.on('end', () => {
                    try {
                        const healthData = JSON.parse(body);
                        console.log(`  📊 Health Status: ${healthData.status}`);
                        if (healthData.system_health) {
                            console.log(`  🔧 System Health: ${JSON.stringify(healthData.system_health, null, 2)}`);
                        }
                    } catch (e) {
                        console.log(`  📄 Response: ${body.substring(0, 100)}...`);
                    }
                });
            }

        } catch (error) {
            console.log(`  ❌ Error: ${error.message}`);

            if (error.code === 'ECONNREFUSED') {
                console.log(`  💡 Suggestion: Check if FastAPI server is running and ngrok tunnel is active`);
            } else if (error.code === 'ENOTFOUND') {
                console.log(`  💡 Suggestion: Verify the ngrok URL is correct`);
            }
        }

        console.log('');
    }

    // Test a search request
    try {
        console.log('Testing search functionality...');

        const searchData = JSON.stringify({
            query: 'test search',
            max_results: 5
        });

        const url = new URL(`${baseUrl}/search`);
        const isHttps = url.protocol === 'https:';
        const client = isHttps ? https : http;

        const options = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(searchData),
                'User-Agent': 'ngrok-test-script'
            },
            timeout: 30000
        };

        const response = await new Promise((resolve, reject) => {
            const req = client.request(options, resolve);
            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Search request timeout'));
            });
            req.write(searchData);
            req.end();
        });

        console.log(`  ✅ Search Status: ${response.statusCode} ${response.statusMessage}`);

        if (response.statusCode === 200) {
            console.log(`  🎉 FastAPI backend is working correctly!`);
        } else if (response.statusCode >= 400) {
            console.log(`  ⚠️  Search endpoint returned error status`);
        }

    } catch (error) {
        console.log(`  ❌ Search test failed: ${error.message}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('🔍 Connection Test Summary');
    console.log('='.repeat(60));
    console.log('If tests pass, your ngrok setup is working correctly!');
    console.log('Copy this URL to your Vercel environment variable:');
    console.log(`FASTAPI_URL=${baseUrl}`);
    console.log('');
    console.log('Next steps:');
    console.log('1. Set FASTAPI_URL in Vercel dashboard');
    console.log('2. Redeploy your Vercel application');
    console.log('3. Test search functionality on your deployed app');
}

// Main execution
const ngrokUrl = process.argv[2];

if (!ngrokUrl) {
    console.log('❌ Error: Please provide ngrok URL as argument');
    console.log('Usage: node test_ngrok_connection.js <ngrok-url>');
    console.log('Example: node test_ngrok_connection.js https://abc123.ngrok.io');
    process.exit(1);
}

if (!ngrokUrl.startsWith('http://') && !ngrokUrl.startsWith('https://')) {
    console.log('❌ Error: URL must start with http:// or https://');
    process.exit(1);
}

// Remove trailing slash
const cleanUrl = ngrokUrl.replace(/\/$/, '');

testConnection(cleanUrl).catch(error => {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
});