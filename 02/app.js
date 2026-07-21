const { Client } = require('pg');

class CLI {
  static helpContent = `An expense recording system

Commands:

add AMOUNT MEMO [DATE] - record a new expense
clear - delete all expenses
list - list all expenses
delete NUMBER - remove expense with id NUMBER
search QUERY - list expenses with a matching memo field`;

  static logHelpContent() {
    console.log(CLI.helpContent)
  };

  constructor() {
    this.app = new ExpenseData();
  }

  processCommand() {
    const args = process.argv;

    if (args.length < 3) return CLI.logHelpContent();

    const command = args[2].trim().toLowerCase();

    switch (command) {
      case 'list':
        this.app.execListCommand();
        break;
      case 'add':
        this.app.execAddCommand();
        break;
      default:
        this.app.logHelpContent();
    };
  }
}

class ExpenseData {
  static clientSettings = { database: 'ls_185_02' };
  static expensesQuery = 'SELECT id, created_on, amount, memo FROM expenses ORDER BY created_on ASC';
  static MIN_ARGS_LENGTH = 4;

  static getCommandArgs() {
    return process.argv.slice(ExpenseData.MIN_ARGS_LENGTH - 1) || [];
  }
  
  static logErrorAndExit(errorObj) {
    console.log(errorObj.message);
    process.exit(1);
  }

  static logErrorInvalidData({validAmount, validMemo}) {
    let error = '';

    if (!validAmount && !validMemo) {
      error = 'an amount and memo.'  
    } else if (!validAmount) {
      error = 'an amount.';
    } else if (!validMemo) {
      error = 'a memo.';
    }

    let errorString = `You must provide ${error}`;

    console.log(errorString);
  }

  static logErrorNoAmountMemo() {
    console.log('You must provide an amount and memo.');
  }

  static logExpenseRow(expenseRecord) {
    let { id, created_on, amount, memo } = expenseRecord;

    let column1 = String(id).padStart(3, " ");
    let column2 = `${created_on.toDateString()}`;
    let column3 = String(amount).padStart(12, " ");
    let column4 = memo;

    console.log([column1, column2, column3, column4].join(' | '));
  }

  static validateAmount(amount) {
    if (amount.length === 0 || amount === 'Infinity') return false;
    return !Number.isNaN(Number(amount));
  }

  static validateMemo(memo) {
    return typeof memo === 'string';
  }
  
  constructor() {
    this.client = new Client(ExpenseData.clientSettings);
  }

  async execListCommand() {
    try {
      await this.client.connect();
    } catch (error) {
      ExpenseData.logErrorAndExit(error);
    }
    
    try {
      let expensesData = await this.client.query(ExpenseData.expensesQuery);
      expensesData.rows.forEach(expenseRecord => ExpenseData.logExpenseRow(expenseRecord));

    } catch (error) {
      ExpenseData.logErrorAndExit(error);
    }

    try {
      await this.client.end();

    } catch (error) {
      ExpenseData.logErrorAndExitlogErrorAndExit(error);
      
    }
  }

  async execAddCommand() {
    let commandArgs = ExpenseData.getCommandArgs();
    if (commandArgs.length < 2) return ExpenseData.logErrorNoAmountMemo();
    
    let [amount, memo] =  commandArgs;
    let [validatedAmount, validatedMemo] = [ExpenseData.validateAmount(amount), ExpenseData.validateMemo(memo)];
    if (!validatedAmount || !validatedMemo) return ExpenseData.logErrorInvalidData({ validAmount: validatedAmount, validMemo: validatedMemo });

    let additionQuery = "INSERT INTO expenses(amount, memo) VALUES ($1, $2)";
    
    await this.client
      .connect()
      .catch(error => ExpenseData.logErrorAndExit(error));
    
    await this.client
      .query(additionQuery, [amount, memo])
      .catch(error => ExpenseData.logErrorAndExit(error));
    
    await this.client
      .end()
      .catch(error => ExpenseData.logErrorAndExit(error));
  }
}

const cli = new CLI();
cli.processCommand();

