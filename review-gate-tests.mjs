import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateReviews} from './lib/review-policy.mjs';
test('review qualification enforces count >= 20 and overall positive rate >= 20%', () => {
  assert.equal(evaluateReviews({ total_reviews: 19, total_positive: 19 }).eligible, false);
  assert.equal(evaluateReviews({ total_reviews: 19, total_positive: 19 }).reason, 'insufficient');
  assert.equal(evaluateReviews({ total_reviews: 20, total_positive: 4 }).eligible, true);
  assert.equal(evaluateReviews({ total_reviews: 20, total_positive: 4 }).reason, null);

  assert.equal(evaluateReviews({ total_reviews: 20, total_positive: 3 }).eligible, false);
  assert.equal(evaluateReviews({ total_reviews: 20, total_positive: 3 }).reason, 'low_positive_rate');
  assert.equal(evaluateReviews({ total_reviews: 20, total_positive: 0 }).eligible, false);
  assert.equal(evaluateReviews({ total_reviews: 20, total_positive: 0 }).reason, 'low_positive_rate');

  assert.equal(evaluateReviews({ total_reviews: 100, total_positive: 20 }).eligible, true);
  assert.equal(evaluateReviews({ total_reviews: 100, total_positive: 19 }).eligible, false);

  for (const summary of [
    null, {}, { total_reviews: 20 }, { total_positive: 10 },
    { total_reviews: -1, total_positive: 0 }, { total_reviews: 20, total_positive: 21 },
    { total_reviews: 20, total_positive: -1 }, { total_reviews: 20, total_positive: null },
    { total_reviews: 20, total_positive: '4' }
  ]) {
    assert.equal(evaluateReviews(summary).reason, 'unknown');
    assert.equal(evaluateReviews(summary).eligible, false);
  }
  assert.equal(evaluateReviews({ total_reviews: 0, total_positive: 0 }).reason, 'insufficient');
});

test('review gate rejects malformed numbers and does not round rates up',()=>{
 for(const value of [NaN,Infinity,1.5,Number.MAX_SAFE_INTEGER+1,'20']){
  assert.equal(evaluateReviews({total_reviews:value,total_positive:4}).reason,'unknown');
  assert.equal(evaluateReviews({total_reviews:20,total_positive:value}).reason,'unknown');
 }
 assert.equal(evaluateReviews({total_reviews:10001,total_positive:2000}).eligible,false);
 for(const total of [20,200,2000,10000]){
  assert.equal(evaluateReviews({total_reviews:total,total_positive:total/5}).eligible,true);
  assert.equal(evaluateReviews({total_reviews:total,total_positive:0}).discovery,0);
 }
});
