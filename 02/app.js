const { Client } = require('pg');
const readlineSync = require('readline-sync');

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
      case 'add':
        this.app.add(arg1, arg2);
        break;
      case 'clear':
        this.app.clear();
        break;
      case 'delete':
        this.app.delete(arg1);
        break;
      case 'list':
        this.app.list();
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
  static clearQuery = "DELETE FROM expenses"
  static deletionQuery = "DELETE FROM expenses WHERE id = $1";
  static expensesQuery = "SELECT id, created_on, amount, memo FROM expenses ORDER BY created_on ASC";
  static retrieveRecordWithId = "SELECT id, created_on, amount, memo FROM expenses WHERE id = $1";
  static searchQuery = "SELECT id, created_on, amount, memo FROM expenses WHERE memo ILIKE $1";
  
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
    
    await this.connect();
    
    await this.client
      .query(ExpenseData.additionQuery, [amount, memo])
      .catch(error => ExpenseData.logErrorAndExit(error));
    
      await this.disconnect();
  }

  allArgsValid() {
    return this.args.every(arg => arg.valid === true);
  }

  async clear() {
    let confirmation = readlineSync.question('This will remove all expenses. Are you sure? (enter y to confirm)\n');

    let affirmativeValues = ['y'];
    if (!affirmativeValues.includes(confirmation)) return;

    await this.connect();

    await this.client
      .query(ExpenseData.clearQuery)
      .catch(error => ExpenseData.logErrorAndExit(error));
    console.log('All expenses have been deleted.');

    await this.disconnect();
  }
  
  async connect() {
    await this.client
      .connect()
      .catch(error => ExpenseData.logErrorAndExit(error));
  }

  async delete(id) {
    await this.connect();

    let matchingRecords = await this.client
      .query(ExpenseData.retrieveRecordWithId, [id])
      .catch(error => ExpenseData.logErrorAndExit(error));
    
    if (matchingRecords.rows.length !== 0) {
      let matchingRow = matchingRecords.rows[0];

      await this.client
        .query(ExpenseData.deletionQuery, [id])
        .catch(error => ExpenseData.logErrorAndExit(error));
      
      console.log('following expense has been deleted:');
      ExpenseData.logExpenseRow(matchingRow);

    } else {
      console.log(`There is no expense with the id '${id}'.`);
    }
        
    await this.disconnect();
  }

  async disconnect() {
    await this.client
      .end()
      .catch(error => ExpenseData.logErrorAndExit(error));
  }

  async list() {
    await this.connect();
    
    try {
      this.expensesData = await this.client.query(ExpenseData.expensesQuery);
      this.logExpenses();

    } catch (error) {
      ExpenseData.logErrorAndExit(error);
    }

    await this.disconnect();
  }

  logExpenses() {
    this.expensesData.rows.forEach(expenseRecord => ExpenseData.logExpenseRow(expenseRecord));
  }

  logErrors() {
    let invalidArgs = this.args.filter(arg => arg.valid === false);

    invalidArgs.forEach(arg => console.log(`You must provide a valid ${arg.name}.`));
  }

  async search(keyword) {
    await this.connect();
    
    this.expensesData = await this.client
      .query(ExpenseData.searchQuery, [`%${keyword}%`])
      .catch(error => ExpenseData.logErrorAndExit(error));

    this.logExpenses()
    
    await this.disconnect();
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

