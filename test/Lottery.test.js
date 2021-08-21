const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const web3 = new Web3(ganache.provider()); // the provider allows us to link to a network
const { interface, bytecode } = require('../compile');

let lottery;
let accounts;


beforeEach(async () => {
    accounts= await web3.eth.getAccounts();
    lottery = await new web3.eth.Contract(JSON.parse(interface))
    .deploy({data: bytecode})
    .send({from: accounts[0], gas: '1000000'})
});

describe('Lottery Contract',()=>{
    it('deploys a contract',()=>{
        assert.ok(lottery.options.address);
    });
    it('allows one account to enter',async () =>{
        await lottery.methods.enter().send({
            from: accounts[0],
            value: web3.utils.toWei('0.02','ether')// using web3 utility for converting ether to wei instead of writing so many zeroes // 0.02 as we need more than 0.01 ether to enter the game 
        });
        const players = await lottery.methods.getPlayers().call({
            from: accounts[0]
        });
        assert.equal(accounts[0],players[0]);
        assert.equal(1,players.length);
    });
    // checking if allows to handle multiple accounts
    it('allows multiple accounts to enter',async () =>{
        await lottery.methods.enter().send({
            from: accounts[0],
            value: web3.utils.toWei('0.02','ether')
        });
        await lottery.methods.enter().send({
            from: accounts[1],
            value: web3.utils.toWei('0.02','ether')
        });
        await lottery.methods.enter().send({
            from: accounts[2],
            value: web3.utils.toWei('0.02','ether')
        });
        const players = await lottery.methods.getPlayers().call({
            from: accounts[0]
        });
        assert.equal(accounts[0],players[0]);
        assert.equal(accounts[1],players[1]);
        assert.equal(accounts[2],players[2]);
        assert.equal(3,players.length);
    });
    // if the lottery test fails or throws any error
    it('requires a minimum amount of ether',async () =>{ // using the try catch to check if somethings wrong in function
        try{
        await lottery.methods.enter().send({
            from: accounts[0],
            value: 100 // 100 wei, we are trying to see that if someone enters less amout of wei than required then something should go wrong and warn us about that
        });
        assert(false); //fails our test if the upper written function doesnot fail as we want this function to fail to be sure about our contract
    }catch(err){
        assert.ok(err); // and now this function is passing as we asserted that an error is present and on running test it verifies that yes there is an error in this function
    }
    });
    // now checking if someone else is using the pickwinner function other than the manager and restricting it
    it('only manager can call pickWinner', async () =>{
        try {
            await lottery.methods.pickWinner().send({ // we should be kicked out as we have already written in the lottery contract that only manager can call function and here we are calling it from account[1] who is not the manger hence it should restrict him from calling pickwinner and fail the function
                from: accounts[1]
            });
            assert(false); // if we get to this line of function we automatically fail the test
        } catch (err) {
            assert(err);
        }
    });
    // now writing funciton to verify that someone can join the contract and get the money in the end and later the array is again initialised as empty
    it('sends money to the winner and resets the players array', async () =>{ // just for the simplicity of this code, we know that we are choosing winner randomly so this function will be complex, but this time we are only going to enter one single payer so we dont have to deal with random nature of the contract
        await lottery.methods.enter().send({
            from: accounts[0],
            value: web3.utils.toWei('0.00002','ether') // any amount of ether just more than .01 or .02
        });
        const initialBalance = await  web3.eth.getBalance(accounts[0]);
        await lottery.methods.pickWinner().send({
            from: accounts[0]
        }); // after we send this money we should be 2 ether less in out initialbalance
        const finalBalnce = await web3.eth.getBalance(accounts[0]); // it will be slightly less than 2 ether as we have also spent some amount as gas money
        const difference = finalBalnce-initialBalance;
        // if you want to see the amount of money spent we can check console log
        console.log(finalBalnce-initialBalance);
        assert(difference > web3.utils.toWei('1.8','ether'));


        // some final checks

        // as lottery has ended, now calling list of all players
        const players = await lottery.methods.getPlayers().call({
            from:accounts[0]
        });
        assert.equal(player.length,0);

        // checking that balance is zero and all money is sent
        const contractBalance = await lottery.methods.getBalance().call({
            from: accounts[0]
        });
        assert.equal(contractBalance,0);
    });
});