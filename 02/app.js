const { Client } = require('pg');

class CLI {
  static helpContent = `An expense recording system

Commands:

add AMOUNT MEMO [DATE] - record a new expense
clear - delete all expenses
list - list all expenses
delete NUMBER - remove expense with id NUMBER
search QUERY - list expenses with a matching memo field`;

  static help() {
    console.log(CLI.helpContent)
  };

  constructor() {
    this.app = new ExpenseData();
  }

  run() {
    let args = process.argv;

    if (args.length < 3) return CLI.help();
    
    let [environment, application, command, arg1, arg2] = args;
    command = command.trim().toLowerCase();

    switch (command) {
      case 'list':
        this.app.list();
        break;
      case 'add':
        this.app.add(arg1, arg2);
        break;
      case 'search':
        this.app.search(arg1);
        break;
      default:
        CLI.help();
    };
  }
}

class ExpenseData {
  static clientSettings = { database: 'ls_185_02' };

  static additionQuery = "INSERT INTO expenses(amount, memo) VALUES ($1, $2)";
  static expensesQuery = 'SELECT id, created_on, amount, memo FROM expenses ORDER BY created_on ASC';
  static searchQuery = 'SELECT id, created_on, amount, memo FROM expenses WHERE memo ILIKE $1';
  
  static logErrorAndExit(errorObj) {
    console.log(errorObj.message);
    process.exit(1);
  }

  static logExpenseRow(expenseRecord) {
    let { id, created_on, amount, memo } = expenseRecord;

    let column1 = String(id).padStart(3, " ");
    let column2 = `${created_on.toDateString()}`;
    let column3 = String(amount).padStart(12, " ");
    let column4 = memo;

    console.log([column1, column2, column3, column4].join(' | '));
  }
  
  constructor() {
    this.client = new Client(ExpenseData.clientSettings);
  }

  async add(amount, memo) {
    this.amount = {name: 'amount', value: amount, valid: false};
    this.memo = {name: 'memo', value: memo, valid: false};
    this.args = [this.amount, this.memo];

    this.validateAmount();
    this.validateMemo();

    if (!this.allArgsValid()) return this.logErrors();
    
    await this.client
      .connect()
      .catch(error => ExpenseData.logErrorAndExit(error));
    
    await this.client
      .query(ExpenseData.additionQuery, [amount, memo])
      .catch(error => ExpenseData.logErrorAndExit(error));
    
    await this.client
      .end()
      .catch(error => ExpenseData.logErrorAndExit(error));
  }

  allArgsValid() {
    return this.args.every(arg => arg.valid === true);
  }

  async list() {
    try {
      await this.client.connect();
    } catch (error) {
      ExpenseData.logErrorAndExit(error);
    }
    
    try {
      this.expensesData = await this.client.query(ExpenseData.expensesQuery);
      this.logExpenses();

    } catch (error) {
      ExpenseData.logErrorAndExit(error);
    }

    try {
      await this.client.end();

    } catch (error) {
      ExpenseData.logErrorAndExit(error);
      
    }
  }

  logExpenses() {
    this.expensesData.rows.forEach(expenseRecord => ExpenseData.logExpenseRow(expenseRecord));
  }

  logErrors() {
    let invalidArgs = this.args.filter(arg => arg.valid === false);

    invalidArgs.forEach(arg => console.log(`You must provide a valid ${arg.name}.`));
  }

  async search(keyword) {

    await this.client
      .connect()
      .catch(error => ExpenseData.logErrorAndExit(error));
    
    this.expensesData = await this.client
      .query(ExpenseData.searchQuery, [`%${keyword}%`])
      .catch(error => ExpenseData.logErrorAndExit(error));

    this.logExpenses()
    
    await this.client
      .end()
      .catch(error => ExpenseData.logErrorAndExit(error));
  }

  validateAmount() {
    this.amount.valid = 
      this.amount.value !== undefined &&
      typeof this.amount.value === 'string' &&
      this.amount.value.length > 0 &&
      !Number.isNaN(Number(this.amount.value)) &&
      this.amount.value !== 'Infinity';
  }
  
  validateMemo() {
    this.memo.valid = 
      this.memo.value !== undefined &&
      (typeof this.memo.value) === 'string' &&
      this.memo.value.length > 0;
  }
}

const cli = new CLI();
cli.run();

