import { discoveryResponse } from '../../server/discovery';

export const dynamic = 'force-static';
export const GET = () => discoveryResponse('llms-full.txt');
