import { medplum } from '../src/config/medplum';

async function run() {
  const newUser = await medplum.readResource(
    'User',
    'b6297c43-03a8-47b2-9f82-53823b7be85b'
  );
  console.log(newUser);
}

run();
