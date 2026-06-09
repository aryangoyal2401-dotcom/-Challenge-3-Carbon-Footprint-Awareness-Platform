// ---------------------------------------------------------------------------
// Emission factors – kg CO₂ per unit
// ---------------------------------------------------------------------------

const EMISSION_FACTORS = {
  transportation: {
    // kg CO₂ per km
    car_gasoline: 0.21,
    car_diesel: 0.17,
    car_electric: 0.05,
    car_hybrid: 0.12,
    bus: 0.089,
    train: 0.041,
    subway: 0.033,
    bicycle: 0,
    walking: 0,
    motorcycle: 0.113,
    domestic_flight: 0.255,
    international_flight: 0.195,
    carpool: 0.105,
    electric_scooter: 0.025,
  },

  energy: {
    // kg CO₂ per kWh (or per unit where noted)
    electricity_global: 0.45,
    electricity_india: 0.82,
    electricity_us: 0.38,
    electricity_eu: 0.28,
    electricity_uk: 0.21,
    natural_gas: 0.2,
    lpg: 0.23,
    heating_oil: 0.27,
    solar: 0.0,
    wind: 0.0,
  },

  food: {
    // kg CO₂ per meal
    beef_meal: 7.0,
    lamb_meal: 5.0,
    pork_meal: 1.8,
    chicken_meal: 1.5,
    fish_meal: 1.2,
    vegetarian_meal: 0.5,
    vegan_meal: 0.3,
    dairy_heavy: 2.0,
  },

  shopping: {
    // kg CO₂ per dollar / unit
    electronics: 0.06,
    clothing_fast: 0.04,
    clothing_sustainable: 0.02,
    furniture: 0.03,
    general_goods: 0.025,
    groceries: 0.015,
  },
};

// ---------------------------------------------------------------------------
// Lookup helper
// ---------------------------------------------------------------------------
function getEmissionFactor(category, subCategory) {
  const cat = EMISSION_FACTORS[category];
  if (!cat) return null;
  const factor = cat[subCategory];
  return factor !== undefined ? factor : null;
}

// ---------------------------------------------------------------------------
// National per-capita monthly averages (kg CO₂)
// ---------------------------------------------------------------------------
const NATIONAL_AVERAGES = {
  global: 400,
  india: 150,
  us: 1300,
  uk: 500,
  eu: 550,
  china: 650,
  canada: 1200,
  australia: 1400,
  japan: 750,
  germany: 700,
  france: 450,
  brazil: 200,
  south_korea: 1000,
  russia: 950,
  indonesia: 180,
};

// ---------------------------------------------------------------------------
// Human-friendly equivalencies
// ---------------------------------------------------------------------------
const EQUIVALENCIES = {
  treesPerTonCO2: 6,
  kmPerKgCO2: 4.76,
  smartphoneChargesPerKgCO2: 122,
  lightbulbHoursPerKgCO2: 42,
};

module.exports = {
  EMISSION_FACTORS,
  getEmissionFactor,
  NATIONAL_AVERAGES,
  EQUIVALENCIES,
};
