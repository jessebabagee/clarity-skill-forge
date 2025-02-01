import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types
} from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
  name: "Can add new learning module with rewards",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const user = accounts.get('wallet_1')!;

    let block = chain.mineBlock([
      // Test adding module as owner
      Tx.contractCall('skill-forge', 'add-module', [
        types.ascii("Test Module"),
        types.ascii("Test Description"),
        types.uint(70), // min score
        types.uint(100) // reward amount
      ], deployer.address),
      
      // Test adding module as non-owner (should fail)
      Tx.contractCall('skill-forge', 'add-module', [
        types.ascii("Test Module 2"),
        types.ascii("Test Description 2"),
        types.uint(70),
        types.uint(100)
      ], user.address)
    ]);

    block.receipts[0].result.expectOk().expectUint(0);
    block.receipts[1].result.expectErr(types.uint(100));
  }
});

Clarinet.test({
  name: "Can complete module and earn rewards",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const user = accounts.get('wallet_1')!;

    // First add a module
    let block1 = chain.mineBlock([
      Tx.contractCall('skill-forge', 'add-module', [
        types.ascii("Test Module"),
        types.ascii("Test Description"),
        types.uint(70),
        types.uint(100)
      ], deployer.address)
    ]);

    const moduleId = block1.receipts[0].result.expectOk().expectUint(0);

    // Complete the module with passing score
    let block2 = chain.mineBlock([
      Tx.contractCall('skill-forge', 'complete-module', [
        types.uint(moduleId),
        types.uint(85)
      ], user.address)
    ]);

    block2.receipts[0].result.expectOk().expectBool(true);

    // Verify progress and rewards
    let block3 = chain.mineBlock([
      Tx.contractCall('skill-forge', 'get-user-progress', [
        types.principal(user.address),
        types.uint(moduleId)
      ], user.address),
      Tx.contractCall('skill-forge', 'get-user-rewards', [
        types.principal(user.address)
      ], user.address)
    ]);

    const progress = block3.receipts[0].result.expectOk().expectSome();
    const rewards = block3.receipts[1].result.expectOk().expectSome();
    
    assertEquals(progress['completed'], true);
    assertEquals(progress['score'], types.uint(85));
    assertEquals(progress['reward-claimed'], true);
    assertEquals(rewards['total-rewards'], types.uint(100));
    assertEquals(rewards['modules-completed'], types.uint(1));
  }
});

Clarinet.test({
  name: "Cannot complete module with insufficient score",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const user = accounts.get('wallet_1')!;

    // Add module with min score 70
    let block1 = chain.mineBlock([
      Tx.contractCall('skill-forge', 'add-module', [
        types.ascii("Test Module"),
        types.ascii("Test Description"),
        types.uint(70),
        types.uint(100)
      ], deployer.address)
    ]);

    const moduleId = block1.receipts[0].result.expectOk().expectUint(0);

    // Try to complete with failing score
    let block2 = chain.mineBlock([
      Tx.contractCall('skill-forge', 'complete-module', [
        types.uint(moduleId),
        types.uint(65)
      ], user.address)
    ]);

    block2.receipts[0].result.expectErr(types.uint(103));
  }
});
