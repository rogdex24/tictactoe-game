#!/usr/bin/env node

const { Client } = require('@heroiclabs/nakama-js');

// Configuration
const serverKey = 'defaultkey';
const host = '127.0.0.1';
const port = '7350';
const useSSL = false;

// Create client
const client = new Client(serverKey, host, port, useSSL);

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function authenticatePlayer(deviceId, username) {
  console.log(`🔐 Authenticating ${username}...`);
  const session = await client.authenticateDevice(deviceId, true, username);
  console.log(`✅ ${username} authenticated`);
  return session;
}

async function createSocket(session) {
  const socket = client.createSocket(useSSL, false);
  await socket.connect(session);
  return socket;
}

async function checkLeaderboard(session, description = '') {
  console.log(`\n📊 ${description}Leaderboard Check:`);
  try {
    const rpcResult = await client.rpc(session, 'get_leaderboard', {});
    const leaderboard = rpcResult.payload;

    if (leaderboard.records && leaderboard.records.length > 0) {
      console.log('📈 Current Rankings:');
      leaderboard.records.forEach((record) => {
        const { wins, losses, draws } = record.stats;
        const expectedScore = 100 + 3 * wins + 1 * draws - 1 * losses;
        const scoreCheck = record.score === expectedScore ? '✅' : '❌';

        console.log(
          `  ${record.rank}. ${record.username}: Score ${record.score} ${scoreCheck} (${wins}W/${losses}L/${draws}D)`,
        );
      });

      // Analysis
      const hasWinners = leaderboard.records.some((r) => r.stats.wins > 0);
      const hasLosers = leaderboard.records.some((r) => r.stats.losses > 0);
      const allPositiveScores = leaderboard.records.every((r) => r.score >= 0);

      console.log(
        `\n🔍 Analysis: Winners=${hasWinners ? '✅' : '❌'}, Losers=${hasLosers ? '✅' : '❌'}, AllPositive=${allPositiveScores ? '✅' : '❌'}`,
      );
      return { hasWinners, hasLosers, allPositiveScores, count: leaderboard.records.length };
    } else {
      console.log('📭 Leaderboard is empty');
      return { hasWinners: false, hasLosers: false, allPositiveScores: true, count: 0 };
    }
  } catch (error) {
    console.error('❌ Failed to fetch leaderboard:', error.message);
    return { hasWinners: false, hasLosers: false, allPositiveScores: false, count: 0 };
  }
}

async function simulateQuickMatch() {
  console.log('🚀 Starting Match Simulation to Test Leaderboard\n');

  let player1Session, player2Session;
  let player1Socket, player2Socket;

  try {
    // Authenticate players
    player1Session = await authenticatePlayer('sim-player-1', 'SimPlayer1');
    player2Session = await authenticatePlayer('sim-player-2', 'SimPlayer2');

    // Check initial state
    await checkLeaderboard(player1Session, 'Initial ');

    // Create sockets
    console.log('\n🔌 Creating sockets...');
    player1Socket = await createSocket(player1Session);
    player2Socket = await createSocket(player2Session);

    // Join matchmaking
    console.log('🎯 Starting matchmaking...');
    const ticket1Promise = player1Socket.addMatchmaker('*', 2, 2);
    const ticket2Promise = player2Socket.addMatchmaker('*', 2, 2);

    await Promise.all([ticket1Promise, ticket2Promise]);
    console.log('✅ Both players joined matchmaking');

    // Wait for match
    let matchFound = false;
    let matchId = null;

    const matchPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Match timeout'));
      }, 15000);

      let foundCount = 0;
      const handleMatch = (matched) => {
        foundCount++;
        matchId = matched.match_id;
        console.log(`🎮 Match found: ${matchId}`);

        if (foundCount === 2) {
          clearTimeout(timeout);
          matchFound = true;
          resolve();
        }
      };

      player1Socket.onmatchmakermatched = handleMatch;
      player2Socket.onmatchmakermatched = handleMatch;
    });

    await matchPromise;

    // Join the match
    console.log('🚪 Joining match...');
    await player1Socket.joinMatch(matchId);
    await player2Socket.joinMatch(matchId);
    console.log('✅ Both players joined match');

    // Set up game completion detection
    let gameCompleted = false;
    let gameResult = null;

    const setupGameListener = (socket, playerName) => {
      socket.onmatchstate = (state) => {
        try {
          const data = JSON.parse(state.state);
          if (data.completed && !gameCompleted) {
            gameCompleted = true;
            gameResult = data.result;
            console.log(`🏁 ${playerName} detected game completion: ${data.result}`);
          }
        } catch (error) {
          // Ignore parse errors
        }
      };
    };

    setupGameListener(player1Socket, 'Player1');
    setupGameListener(player2Socket, 'Player2');

    // Simulate a quick win - Player 1 gets top row
    console.log('\n🎯 Simulating game moves...');
    console.log('   Player1 (X) will win with top row: positions 0, 1, 2');

    // Player 1: X at position 0
    await player1Socket.sendMatchState(matchId, 1, JSON.stringify({ position: 0 }));
    await wait(800);

    // Player 2: O at position 3
    await player2Socket.sendMatchState(matchId, 1, JSON.stringify({ position: 3 }));
    await wait(800);

    // Player 1: X at position 1
    await player1Socket.sendMatchState(matchId, 1, JSON.stringify({ position: 1 }));
    await wait(800);

    // Player 2: O at position 4
    await player2Socket.sendMatchState(matchId, 1, JSON.stringify({ position: 4 }));
    await wait(800);

    // Player 1: X at position 2 - WINNING MOVE!
    await player1Socket.sendMatchState(matchId, 1, JSON.stringify({ position: 2 }));
    console.log('🎯 Player1 made winning move at position 2');

    // Wait for game completion and backend processing
    console.log('⏳ Waiting for game completion and leaderboard update...');
    await wait(8000); // Give extra time for all backend processing

    if (gameCompleted) {
      console.log(`✅ Game completed with result: ${gameResult}`);
    } else {
      console.log(
        '⚠️ Game completion not detected via client, but backend should have processed it',
      );
    }

    // Check leaderboard after match
    const result = await checkLeaderboard(player1Session, 'Post-Match ');

    // Analyze results
    console.log('\n🎉 SIMULATION RESULTS:');
    if (result.hasWinners && result.hasLosers) {
      console.log('✅ SUCCESS: Both winners AND losers are in the leaderboard!');
      console.log('🔧 BUG FIX CONFIRMED: Negative score issue resolved');
    } else if (result.hasWinners && !result.hasLosers) {
      console.log('❌ PARTIAL: Only winners recorded (original bug still exists)');
    } else if (!result.hasWinners && !result.hasLosers) {
      console.log('❌ FAILED: No players recorded in leaderboard');
    }

    if (result.allPositiveScores) {
      console.log('✅ All scores are positive (Nakama requirement satisfied)');
    } else {
      console.log('❌ Some scores are negative (Nakama will reject them)');
    }

    console.log(`📊 Total players in leaderboard: ${result.count}`);
  } catch (error) {
    console.error('❌ Simulation failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    // Clean up
    if (player1Socket) {
      try {
        player1Socket.disconnect();
      } catch (e) {
        /* ignore */
      }
    }
    if (player2Socket) {
      try {
        player2Socket.disconnect();
      } catch (e) {
        /* ignore */
      }
    }
  }
}

// Run the simulation
simulateQuickMatch().catch(console.error);
