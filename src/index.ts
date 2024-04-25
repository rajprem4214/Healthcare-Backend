import app from './app';
import { validateEnvironmentConfig } from './config/env';
const port = process.env.PORT || 8090;

validateEnvironmentConfig();

app.listen(port, () => {
  /* eslint-disable no-console */
  console.log(`Listening: http://localhost:${port}`);
  /* eslint-enable no-console */
});
