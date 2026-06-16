(() => {
  const WEEKS_PER_MONTH = 4.33;
  const LENGTH_MULT = { 30: 1, 45: 1.25, 60: 1.5 };
  const PLAN_MULT = { monthly: 1, quarterly: 0.9, semiannual: 0.82 };
  const PLAN_MONTHS = { monthly: 1, quarterly: 3, semiannual: 6 };
  const FREQ_FLOOR = { 1: 250, 2: 400, 3: 500 };

  // Marginal brackets (like tax brackets): the rate applies only to the
  // portion within each band. This keeps participants and price monotonic,
  // i.e. a bigger company never shows fewer participants or a lower total.
  const PARTICIPATION_TIERS = [
    { upTo: 15, rate: 0.6 },
    { upTo: 30, rate: 0.33 },
    { upTo: 60, rate: 0.23 },
    { upTo: 150, rate: 0.16 },
    { upTo: 300, rate: 0.13 },
    { upTo: Infinity, rate: 0.1 },
  ];

  // Marginal €/person/session by participant count (volume discount applies
  // to each additional participant, not retroactively to all of them).
  const PARTICIPANT_RATE_TIERS = [
    { upTo: 10, rate: 4.06 },
    { upTo: 20, rate: 2.65 },
    { upTo: 40, rate: 1.79 },
    { upTo: 80, rate: 1.33 },
    { upTo: 160, rate: 1.01 },
    { upTo: Infinity, rate: 0.78 },
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

  function marginalSum(value, tiers) {
    let prev = 0;
    let total = 0;
    for (const tier of tiers) {
      const span = Math.min(value, tier.upTo) - prev;
      if (span > 0) total += span * tier.rate;
      prev = tier.upTo;
      if (value <= tier.upTo) break;
    }
    return total;
  }

  function estimateParticipants(employees) {
    return Math.max(1, Math.round(marginalSum(employees, PARTICIPATION_TIERS)));
  }

  function monthlyFloor(frequency) {
    return FREQ_FLOOR[frequency] || FREQ_FLOOR[1];
  }

  function sessionsPerMonth(frequency) {
    return Math.round(frequency * WEEKS_PER_MONTH);
  }

  function calculate() {
    const participants = estimateParticipants(state.employees);
    const sessionsMonth = sessionsPerMonth(state.frequency);
    const floor = monthlyFloor(state.frequency);
    const lengthMult = LENGTH_MULT[state.length] || 1;

    const perSessionCost = marginalSum(participants, PARTICIPANT_RATE_TIERS) * lengthMult;
    const perPersonSession = Math.round(perSessionCost / participants);
    const rawMonthly = Math.round(perSessionCost * sessionsMonth);

    const monthlyBeforePlan = Math.max(floor, rawMonthly);
    const useFloorBreakdown = rawMonthly <= floor;
    const showFlatHero = useFloorBreakdown;

    const planMult = PLAN_MULT[state.plan] || 1;
    const monthlyTotal = Math.round(monthlyBeforePlan * planMult);
    const months = PLAN_MONTHS[state.plan];
    const billedTotal = monthlyTotal * months;
    const savings = state.plan === 'monthly'
      ? 0
      : (monthlyBeforePlan - monthlyTotal) * months;

    return {
      participants,
      perPersonSession,
      sessionsMonth,
      floor,
      showFlatHero,
      useFloorBreakdown,
      monthlyBeforePlan,
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
