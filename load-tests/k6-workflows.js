import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    workflow_spike: {
      executor: 'constant-arrival-rate',
      rate: 1000,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 250,
      maxVUs: 2000,
    }
  }
};

const base = __ENV.BASE_URL || 'http://localhost:8000';
const headers = { 'Content-Type': 'application/json', 'x-api-key': __ENV.API_KEY || 'dev-api-key' };

export default function () {
  const body = JSON.stringify({ query: 'enterprise multi-agent observability', max_results: 1, max_sources_to_read: 1 });
  const res = http.post(`${base}/v1/research/workflows`, body, { headers });
  check(res, { 'status ok': (r) => r.status === 200 || r.status === 429 });
  sleep(0.1);
}
