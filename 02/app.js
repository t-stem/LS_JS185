const { Client } = require('pg');

const clientSettings = { database: 'ls_185_02' };
const client = new Client(clientSettings);

app();

function app() {
  const args = process.argv;

  if (args.length < 3) return logHelpContent();

  const command = args[2].trim().toLowerCase();

  switch (command) {
    case 'list':
      execListCommand();
      break;
    case 'add':
      execAddCommand();
      break;
    default:
      logHelpContent();
  };
};

async function execListCommand() {
  const expensesQuery = 'SELECT id, created_on, amount, memo FROM expenses ORDER BY created_on ASC';
  
  try {
    await client.connect();
  } catch (error) {
    logErrorAndExit(error);
  }
  
  try {
    let expensesData = await client.query(expensesQuery);
    expensesData.rows.forEach(expenseRecord => logExpenseRow(expenseRecord))
  } catch (error) {
    logErrorAndExit(error);
  }

  try {
    await client.end();
  } catch (error) {
    logErrorAndExit(error);
  }
}

async function execAddCommand() {
  let commandArgs = getCommandArgs();
  if (commandArgs.length < 2) return logErrorNoAmountMemo();
  
  let [amount, memo] =  commandArgs;
  let [validatedAmount, validatedMemo] = [validateAmount(amount), validateMemo(memo)];
  if (!validatedAmount || !validatedMemo) return logErrorInvalidData({ validAmount: validatedAmount, validMemo: validatedMemo });

  let additionQuery = "INSERT INTO expenses(amount, memo) VALUES ($1, $2)";
  
  await client
    .connect()
    .catch(error => logErrorAndExit(error));
  
  await client
    .query(additionQuery, [amount, memo])
    .catch(error => logErrorAndExit(error));
  
  await client
    .end()
    .catch(error => logErrorAndExit(error));
}

function getCommandArgs() {
  const MIN_LENGTH = 4;

  return process.argv.slice(MIN_LENGTH - 1) || [];
}

function logExpenseRow(expenseRecord) {
  let { id, created_on, amount, memo } = expenseRecord;

  let column1 = String(id).padStart(3, " ");
  let column2 = `${created_on.toDateString()}`;
  let column3 = String(amount).padStart(12, " ");
  let column4 = memo;

  console.log([column1, column2, column3, column4].join(' | '));
};

function validateAmount(amount) {
  if (amount.length === 0 || amount === 'Infinity') return false;
  return !Number.isNaN(Number(amount));
};

function validateMemo(memo) {
  return typeof memo === 'string';
};

function logErrorNoAmountMemo() {
  console.log('You must provide an amount and memo.');
};

function logErrorInvalidData({validAmount, validMemo}) {
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

function logHelpContent() {
  let helpContent = `An expense recording system

Commands:

add AMOUNT MEMO [DATE] - record a new expense
clear - delete all expenses
list - list all expenses
delete NUMBER - remove expense with id NUMBER
search QUERY - list expenses with a matching memo field`;

  console.log(helpContent)
};

function logErrorAndExit(errorObj) {
  console.log(errorObj.message);
  process.exit(1);
}