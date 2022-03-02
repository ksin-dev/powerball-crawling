import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import {parse,format} from 'date-fns'

export type Env = {
  startDate: Date;
  endDate: Date;
  output: string;
  id: string;
  password: string;
  headless: boolean;
  retry: number;
}

export let env: Env = {
  startDate: new Date(),
  endDate: new Date(),
  output: '',
  id: '',
  password: '',
  headless: false,
  retry: 10
}

const promise = yargs(hideBin(process.argv))
  .option('start-date', {
    type: 'string',
    default: '2021-01-03'
  })
  .option('end-date', {
    type: 'string',
    default: format(new Date(),'yyyy-MM-dd')
  })
  .option('output', {
    type: 'string',
    default:'results.csv'
  })
  .option('id', {
    type: 'string'
  })
  .option('password', {
    type:'string'
  })
  .option('headless', {
    type: 'boolean',
    default:false
  })
  .option('retry', {
    type: 'number',
    default: 10
  })
  .demandOption(['id','password'])
  .argv



export const init = async () => {
  const argv = await promise;;

  env.startDate = parse(argv.startDate, 'yyyy-MM-dd', new Date());
  env.endDate = parse(argv.endDate, 'yyyy-MM-dd', new Date());
  env.output = argv.output;
  env.id = argv.id;
  env.password = argv.password;
  env.headless = argv.headless;
  env.retry = argv.retry;
}

