module.exports = async function retry(fn, options = {}) {
  const { retries = 3, factor = 2, minTimeout = 100, maxTimeout = 2000 } = options;
  let attempt = 0;

  const wait = ms => new Promise(res => setTimeout(res, ms));

  while (true) {
    try {
      const result = await fn();
      return result;
    } catch (err) {
      attempt++;
      if (attempt > retries) throw err;
      const timeout = Math.min(maxTimeout, minTimeout * Math.pow(factor, attempt - 1));
      await wait(timeout);
    }
  }
};
