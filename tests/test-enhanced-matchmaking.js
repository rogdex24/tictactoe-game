const { Client } = require('@heroiclabs/nakama-js');

async function testMatchmakerWithJoin() {
  console.log('🚀 Testing Matchmaker with Enhanced Client-Side Handling');

  const client = new Client('defaultkey', '127.0.0.1', '7350');

  // Authenticate both players
  console.log('🔐 Authenticating players...');
  const session1 = await client.authenticateDevice(`player1-${Date.now()}-${Math.random()}`);
  const session2 = await client.authenticateDevice(`player2-${Date.now()}-${Math.random()}`);

  // Create sockets
  const socket1 = client.createSocket();
  const socket2 = client.createSocket();

  // Connect sockets
  console.log('🔌 Connecting sockets...');
  await socket1.connect(session1);
  await socket2.connect(session2);

  console.log('📊 Socket states:');
  console.log('   Player 1 connected: ✅');
  console.log('   Player 2 connected: ✅');

  // Track results
  let player1Matched = false;
  let player2Matched = false;
  let matchToken1 = null;
  let matchToken2 = null;
  let joinResults = [];

  // ✅ CORRECTED: Use proper event handler name
  socket1.onmatchmakermatched = async (matched) => {
    console.log('🎉 PLAYER 1 MATCHMAKER MATCHED RECEIVED!', matched);
    console.log('   Match token:', matched.token);
    console.log('   Match ID:', matched.match_id);
    console.log('   Matched users:', matched.users);

    player1Matched = true;
    matchToken1 = matched.token || matched.match_id;

    if (matchToken1) {
      try {
        console.log('🏁 Player 1 attempting to join match...');
        const joinResult = await socket1.joinMatch(matchToken1);
        console.log('✅ Player 1 successfully joined match:', joinResult.match_id);
        joinResults.push({ player: 1, success: true, matchId: joinResult.match_id });
      } catch (error) {
        console.error('❌ Player 1 failed to join match:', error);
        joinResults.push({ player: 1, success: false, error: error.message });
      }
    }
  };

  // ✅ CORRECTED: Use proper event handler name
  socket2.onmatchmakermatched = async (matched) => {
    console.log('🎉 PLAYER 2 MATCHMAKER MATCHED RECEIVED!', matched);
    console.log('   Match token:', matched.token);
    console.log('   Match ID:', matched.match_id);
    console.log('   Matched users:', matched.users);

    player2Matched = true;
    matchToken2 = matched.token || matched.match_id;

    if (matchToken2) {
      try {
        console.log('🏁 Player 2 attempting to join match...');
        const joinResult = await socket2.joinMatch(matchToken2);
        console.log('✅ Player 2 successfully joined match:', joinResult.match_id);
        joinResults.push({ player: 2, success: true, matchId: joinResult.match_id });
      } catch (error) {
        console.error('❌ Player 2 failed to join match:', error);
        joinResults.push({ player: 2, success: false, error: error.message });
      }
    }
  };

  // Add error handlers
  socket1.onerror = (error) => console.log('❌ Socket 1 Error:', error);
  socket2.onerror = (error) => console.log('❌ Socket 2 Error:', error);

  console.log('🎫 Adding players to matchmaker...');

  // ✅ CORRECTED: Use socket.addMatchmaker (not client.addMatchmaker)
  const [ticket1, ticket2] = await Promise.all([
    socket1.addMatchmaker('*', 2, 2, { mode: 'classic' }),
    socket2.addMatchmaker('*', 2, 2, { mode: 'classic' }),
  ]);

  console.log(`✅ Both players queued:`);
  console.log(`   Player 1: ${ticket1.ticket}`);
  console.log(`   Player 2: ${ticket2.ticket}`);

  // Wait for matchmaker and join attempts
  console.log('⏳ Waiting for matchmaker and join attempts (up to 25 seconds)...');

  let elapsed = 0;
  const maxWait = 25000; // 25 seconds
  const checkInterval = 1000; // Check every second

  while (elapsed < maxWait) {
    await new Promise((resolve) => setTimeout(resolve, checkInterval));
    elapsed += checkInterval;

    if (elapsed % 5000 === 0) {
      console.log(`   ⏰ ${elapsed / 1000}s elapsed...`);
      console.log(`   Notifications received: P1=${player1Matched}, P2=${player2Matched}`);
    }

    // If both matched and attempted joins, we can finish early
    if (player1Matched && player2Matched && joinResults.length >= 2) {
      console.log('🚀 Both players processed, finishing early');
      break;
    }
  }

  // Final Results
  console.log('\n📊 FINAL RESULTS:');
  console.log(`   Total wait time: ${elapsed / 1000}s`);
  console.log(`   Player 1 matched: ${player1Matched ? '✅' : '❌'}`);
  console.log(`   Player 2 matched: ${player2Matched ? '✅' : '❌'}`);
  console.log(`   Join attempts: ${joinResults.length}`);

  if (player1Matched && player2Matched) {
    console.log('🎉 SUCCESS: Both players received matchmaker notifications!');
    console.log(`   Match tokens: ${matchToken1} | ${matchToken2}`);
    console.log(`   Same token: ${matchToken1 === matchToken2 ? '✅ YES' : '❌ NO'}`);

    // Check join results
    const successful = joinResults.filter((r) => r.success);
    const failed = joinResults.filter((r) => !r.success);

    console.log(`   Successful joins: ${successful.length}/2`);
    if (successful.length > 0) {
      console.log(
        '   ✅ Join successes:',
        successful.map((r) => `P${r.player}: ${r.matchId}`),
      );
    }
    if (failed.length > 0) {
      console.log(
        '   ❌ Join failures:',
        failed.map((r) => `P${r.player}: ${r.error}`),
      );
    }
  } else {
    console.log('❌ FAILURE: Matchmaker notifications not received');
    if (!player1Matched && !player2Matched) {
      console.log('   🔍 Neither player received notification');
    } else {
      console.log('   🔍 Only one player received notification');
    }
  }

  // Cleanup
  console.log('🧹 Cleaning up...');
  await socket1.disconnect();
  await socket2.disconnect();

  console.log('🏁 Test complete\n');
}

// Run the enhanced test
testMatchmakerWithJoin().catch(console.error);
