/**
 * 核心計算邏輯
 * input.incomeItems          = [{ name, amount }]
 * input.variableExpenseItems = [{ name, amount }]
 * input.toFamily             = number
 * input.previousMonthPaid    = number
 * configItems                = DB rows from config_items
 */
function calculate(input, configItems) {
  const {
    incomeItems = [],
    variableExpenseItems = [],
    previousMonthPaid = 0,
    toFamily = 0,
  } = input;

  // === 金額計算 ===
  const monthlyIncome = incomeItems.reduce((sum, i) => sum + (i.amount || 0), 0);
  const personalAccountIncome = monthlyIncome - toFamily + previousMonthPaid;

  const fixedExpenseItems  = configItems.filter(i => i.type === 'expense'  && i.is_enabled);
  const fixedTransferItems = configItems.filter(i => i.type === 'transfer' && i.is_enabled);

  const varExpenseTotal   = variableExpenseItems.reduce((sum, i) => sum + (i.amount || 0), 0);
  const fixedExpenseTotal = fixedExpenseItems.reduce((sum, i) => sum + i.amount, 0);
  const personalAccountExpense = varExpenseTotal + fixedExpenseTotal;
  const personalAccountBalance = personalAccountIncome - personalAccountExpense;

  // === 轉帳清單 ===
  const transferList = [];
  let order = 1;

  // 1. 薪轉戶保留家用
  transferList.push({
    order: order++, from: '薪轉戶（家庭帳戶）', to: '保留家用',
    amount: toFamily, description: '家用',
  });

  // 2. 薪轉戶 → 各家庭支出帳戶（type=transfer）
  for (const item of fixedTransferItems) {
    transferList.push({
      order: order++, from: '薪轉戶', to: item.account_name,
      amount: item.amount, description: item.name,
    });
  }

  // 3. 薪轉戶 → 個人帳戶
  transferList.push({
    order: order++, from: '薪轉戶', to: '個人帳戶',
    amount: personalAccountIncome, description: '個人帳戶進帳',
  });

  // 4. 個人帳戶 → 變動支出各帳戶
  for (const item of variableExpenseItems) {
    if ((item.amount || 0) > 0) {
      transferList.push({
        order: order++, from: '個人帳戶',
        to: item.name + '帳戶',
        amount: item.amount, description: item.name,
      });
    }
  }

  // 5. 個人帳戶 → 固定支出各帳戶（type=expense）
  for (const item of fixedExpenseItems) {
    transferList.push({
      order: order++, from: '個人帳戶',
      to: item.account_name, amount: item.amount, description: item.name,
    });
  }

  // === 費用明細（供前端顯示計算步驟）===
  const breakdown = {
    incomeItems,
    monthlyIncome,
    toFamily,
    previousMonthPaid,
    personalAccountIncome,
    variableExpenseItems: variableExpenseItems.filter(i => (i.amount || 0) > 0),
    fixedExpenseItems: fixedExpenseItems.map(i => ({ name: i.name, amount: i.amount })),
    varExpenseTotal,
    fixedExpenseTotal,
    personalAccountExpense,
    personalAccountBalance,
  };

  return {
    monthlyIncome,
    personalAccountIncome,
    personalAccountExpense,
    personalAccountBalance,
    transferList,
    breakdown,
  };
}

module.exports = { calculate };
