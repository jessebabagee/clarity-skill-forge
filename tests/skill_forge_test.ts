import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types
} from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
  name: "Can add new learning module",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const user = accounts.get('wallet_1')!;

    let block = chain.mineBlock([
      // Test adding module as owner
      Tx.contractCall('skill-forge', 'add-module', [
        types.ascii("Test Module"),
        types.ascii("Test Description")
      ], deployer.address),
      
      // Test adding module as non-owner (should fail)
      Tx.contractCall('skill-forge', 'add-module', [
        types.ascii("Test Module 2"),
        types.ascii("Test Description 2")
      ], user.address)
    ]);

    block.receipts[0].result.expectOk().expectUint(0);
    block.receipts[1].result.expectErr(types.uint(100));
  }
});

Clarinet.test({
  name: "Can complete module and track progress",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const user = accounts.get('wallet_1')!;

    // First add a module
    let block1 = chain.mineBlock([
      Tx.contractCall('skill-forge', 'add-module', [
        types.ascii("Test Module"),
        types.ascii("Test Description")
      ], deployer.address)
    ]);

    const moduleId = block1.receipts[0].result.expectOk().expectUint(0);

    // Complete the module
    let block2 = chain.mineBlock([
      Tx.contractCall('skill-forge', 'complete-module', [
        types.uint(moduleId),
        types.uint(85)
      ], user.address)
    ]);

    block2.receipts[0].result.expectOk().expectBool(true);

    // Verify progress
    let block3 = chain.mineBlock([
      Tx.contractCall('skill-forge', 'get-user-progress', [
        types.principal(user.address),
        types.uint(moduleId)
      ], user.address)
    ]);

    const progress = block3.receipts[0].result.expectOk().expectSome();
    assertEquals(progress['completed'], true);
    assertEquals(progress['score'], types.uint(85));
  }
});

Clarinet.test({
  name: "Can add and retrieve quiz",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    
    // Add module first
    let block1 = chain.mineBlock([
      Tx.contractCall('skill-forge', 'add-module', [
        types.ascii("Test Module"),
        types.ascii("Test Description")
      ], deployer.address)
    ]);

    const moduleId = block1.receipts[0].result.expectOk().expectUint(0);

    // Add quiz
    const questions = types.list([types.ascii("Q1"), types.ascii("Q2")]);
    const answers = types.list([types.uint(1), types.uint(2)]);

    let block2 = chain.mineBlock([
      Tx.contractCall('skill-forge', 'add-quiz', [
        types.uint(moduleId),
        questions,
        answers
      ], deployer.address)
    ]);

    block2.receipts[0].result.expectOk().expectUint(0);

    // Get quiz
    let block3 = chain.mineBlock([
      Tx.contractCall('skill-forge', 'get-quiz', [
        types.uint(0)
      ], deployer.address)
    ]);

    const quiz = block3.receipts[0].result.expectOk().expectSome();
    assertEquals(quiz['module-id'], types.uint(moduleId));
  }
});