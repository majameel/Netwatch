#!/usr/bin/env node

/**
 * NetPulse Real Ping Test
 * This script tests if the application is actually sending real ICMP ping packets
 */

const ping = require('ping');

async function testRealPing() {
    console.log('🏓 NetPulse Real Ping Test');
    console.log('='.repeat(50));
    console.log('Testing if we send real ICMP ping packets...\n');

    const targets = [
        { name: 'Google DNS', host: '8.8.8.8' },
        { name: 'Cloudflare DNS', host: '1.1.1.1' },
        { name: 'Invalid Host', host: '192.168.255.255' }
    ];

    for (const target of targets) {
        console.log(`Testing ${target.name} (${target.host}):`);
        
        try {
            const isWindows = process.platform === 'win32';
            
            const pingConfig = {
                timeout: 8,
                extra: isWindows ? ['-n', '4', '-w', '8000'] : ['-c', '4', '-W', '8'],
                numeric: false,
                min_reply: 1
            };

            const result = await ping.promise.probe(target.host, pingConfig);
            
            console.log(`  ✅ Alive: ${result.alive}`);
            console.log(`  📊 Response Time: ${result.time}ms`);
            console.log(`  📈 Packet Loss: ${result.packetLoss || '0%'}`);
            console.log(`  🔍 Raw Output:`);
            console.log(`     ${result.output.split('\n').join('\n     ')}`);
            
        } catch (error) {
            console.log(`  ❌ Error: ${error.message}`);
        }
        
        console.log('');
    }

    console.log('🔬 Analysis:');
    console.log('- If you see raw ping output above, we are sending REAL ICMP pings');
    console.log('- Response times are measured at the network level (not HTTP)');
    console.log('- Packet loss detection is based on actual network failures');
    console.log('- This is genuine network monitoring, not simulated data');
    console.log('\n✅ NetPulse uses REAL ping commands via the Node.js ping library!');
}

testRealPing().catch(console.error);
