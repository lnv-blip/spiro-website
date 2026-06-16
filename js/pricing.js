(() => {
  const WEEKS_PER_MONTH = 4.33;
  const RAMP_START = 21;
  const RAMP_END = 50;
  const LENGTH_MULT = { 30: 1, 45: 1.25, 60: 1.5 };
  const PLAN_MULT = { monthly: 1, quarterly: 0.9, semiannual: 0.82 };
  const PLAN_MONTHS = { monthly: 1, quarterly: 3, semiannual: 6 };
  const FREQ_FLOOR = { 1: 250, 2: 400, 3: 500 };

  const PARTICIPATION_TIERS = [
    { max: 15, rate: 0.6 },
    { max: 30, rate: 0.45 },
    { max: 60, rate: 0.35 },
    { max: 150, rate: 0.25 },
    { max: 300, rate: 0.2 },
    { max: Infinity, rate: 0.15 },
  ];

  const COMPANY_RATE_TIERS = [
    { max: 20, rate: null },
    { max: 40, rate: 5.5 },
    { max: 75, rate: 4 },
    { max: 150, rate: 2.8 },
    { max: 300, rate: 2 },
    { max: Infinity, rate: 1.5 },
  ];

  const state = {
    length: 45,
    frequency: 2,
    employees: 50,
    plan: 'monthly',
  };

  let root = null;

  function getLang() {
    return document.documentElement.lang || 'en';
  }

  function t(key) {
    const lang = getLang();
    const table = typeof translations !== 'undefined' ? translations[lang] : null;
    return (table && table[key]) || (translations?.en?.[key]) || key;
  }

  function formatPrice(amount) {
    return `€${Math.round(amount)}`;
  }

  function withVat(amount) {
    return `${formatPrice(amount)} ${t('calc.vatSuffix')}`;
  }

  function participationRate(employees) {
    return PARTICIPATION_TIERS.find((tier) => employees <= tier.max).rate;
  }

  function estimateParticipants(employees) {
    return Math.max(1, Math.round(employees * participationRate(employees)));
  }

  function companyRate(employees) {
    return COMPANY_RATE_TIERS.find((tier) => employees <= tier.max).rate;
  }

  function monthlyFloor(frequency) {
    return FREQ_FLOOR[frequency] || FREQ_FLOOR[1];
  }

  function sessionsPerMonth(frequency) {
    return Math.round(frequency * WEEKS_PER_MONTH);
  }

  function resolveMonthly(employees, floor, rawMonthly, baseRate, lengthMult) {
    if (employees <= 20) {
      return {
        monthlyBeforePlan: floor,
        perPersonSession: null,
        showFlatHero: true,
        useFloorBreakdown: true,
      };
    }

    const perPersonSession = Math.round(baseRate * lengthMult);
    const effective = Math.max(floor, rawMonthly);

    if (employees >= RAMP_END) {
      const belowFloor = rawMonthly < floor;
      return {
        monthlyBeforePlan: effective,
        perPersonSession,
        showFlatHero: belowFloor,
        useFloorBreakdown: belowFloor,
      };
    }

    const ramp = (employees - RAMP_START) / (RAMP_END - RAMP_START);
    const ramped = Math.round(floor + (effective - floor) * ramp);

    return {
      monthlyBeforePlan: ramped,
      perPersonSession,
      showFlatHero: false,
      useFloorBreakdown: false,
    };
  }

  function calculate() {
    const participants = estimateParticipants(state.employees);
    const sessionsMonth = sessionsPerMonth(state.frequency);
    const floor = monthlyFloor(state.frequency);
    const lengthMult = LENGTH_MULT[state.length] || 1;
    const baseRate = companyRate(state.employees);

    let rawMonthly = 0;
    if (baseRate !== null) {
      rawMonthly = Math.round(baseRate * participants * lengthMult * sessionsMonth);
    }

    const resolved = resolveMonthly(
      state.employees,
      floor,
      rawMonthly,
      baseRate,
      lengthMult
    );

    const planMult = PLAN_MULT[state.plan] || 1;
    const monthlyTotal = Math.round(resolved.monthlyBeforePlan * planMult);
    const months = PLAN_MONTHS[state.plan];
    const billedTotal = monthlyTotal * months;
    const savings = state.plan === 'monthly'
      ? 0
      : (resolved.monthlyBeforePlan - monthlyTotal) * months;

    return {
      participants,
      perPersonSession: resolved.perPersonSession,
      sessionsMonth,
      floor,
      showFlatHero: resolved.showFlatHero,
      useFloorBreakdown: resolved.useFloorBreakdown,
      monthlyBeforePlan: resolved.monthlyBeforePlan,
      monthlyTotal,
      billedTotal,
      savings,
      months,
    };
  }

  function buildBreakdown(result) {
    if (result.useFloorBreakdown) {
      return t('calc.breakdownFloor')
        .replace('{freq}', state.frequency)
        .replace('{length}', state.length);
    }

    return t('calc.breakdownAbove')
      .replace('{sessions}', result.sessionsMonth)
      .replace('{length}', state.length)
      .replace('{participants}', result.participants);
  }

  function setSegment(group, value, attr) {
    group.querySelectorAll('[data-calc-option]').forEach((btn) => {
      const active = String(btn.dataset.calcOption) === String(value);
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active);
    });
    state[attr] = attr === 'length' || attr === 'frequency' ? Number(value) : value;
    render();
  }

  function render() {
    if (!root) return;

    const result = calculate();

    const employeesOut = root.querySelector('#calcEmployeesValue');
    const participantsOut = root.querySelector('#calcParticipants');
    const heroLabel = root.querySelector('#calcHeroLabel');
    const heroValue = root.querySelector('#calcHeroValue');
    const breakdownOut = root.querySelector('#calcBreakdown');
    const monthlyOut = root.querySelector('#calcMonthly');
    const savingsWrap = root.querySelector('#calcSavingsWrap');
    const savingsOut = root.querySelector('#calcSavings');
    const billedWrap = root.querySelector('#calcBilledWrap');
    const billedLabel = root.querySelector('#calcBilledLabel');
    const billedOut = root.querySelector('#calcBilled');

    if (employeesOut) employeesOut.textContent = state.employees;

    if (participantsOut) {
      participantsOut.textContent = t('calc.participants').replace('{n}', result.participants);
    }

    if (heroLabel) {
      heroLabel.textContent = result.showFlatHero
        ? t('calc.floorLabel')
        : t('calc.perPersonLabel');
    }

    if (heroValue) {
      heroValue.textContent = result.showFlatHero
        ? `${t('calc.floorHero').replace('{n}', result.floor)} ${t('calc.vatSuffix')}`
        : withVat(result.perPersonSession);
    }

    if (breakdownOut) breakdownOut.textContent = buildBreakdown(result);
    if (monthlyOut) monthlyOut.textContent = withVat(result.monthlyTotal);

    const showCommitment = state.plan !== 'monthly';
    savingsWrap?.classList.toggle('hidden', !showCommitment);
    billedWrap?.classList.toggle('hidden', !showCommitment);

    if (showCommitment) {
      if (savingsOut) savingsOut.textContent = withVat(result.savings);
      if (billedLabel) {
        billedLabel.textContent = state.plan === 'quarterly'
          ? t('calc.billedQuarterly')
          : t('calc.billedSemiannual');
      }
      if (billedOut) billedOut.textContent = withVat(result.billedTotal);
    }
  }

  function bind() {
    root = document.getElementById('pricingCalc');
    if (!root) return;

    const slider = root.querySelector('#calcEmployees');
    if (slider) {
      state.employees = Number(slider.value);
      slider.addEventListener('input', () => {
        state.employees = Number(slider.value);
        render();
      });
    }

    root.querySelectorAll('[data-calc-group]').forEach((group) => {
      const attr = group.dataset.calcGroup;
      group.querySelectorAll('[data-calc-option]').forEach((btn) => {
        btn.addEventListener('click', () => {
          setSegment(group, btn.dataset.calcOption, attr);
        });
      });
    });

    render();
  }

  document.addEventListener('DOMContentLoaded', bind);
  document.addEventListener('spiro:langchange', render);
})();
