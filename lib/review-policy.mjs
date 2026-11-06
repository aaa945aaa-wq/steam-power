export const MIN_REVIEWS=20;
export const MIN_POSITIVE_RATE=0.2;
export function evaluateReviews(summary){
 const total=summary?.total_reviews,positive=summary?.total_positive;
 const invalid=!Number.isSafeInteger(total)||total<0||
  !Number.isSafeInteger(positive)||positive<0||positive>total;
 if(invalid)return {reviewCount:null,eligible:false,reason:'unknown',discovery:0};
 const hasCount=total>=MIN_REVIEWS;
 const eligible=hasCount&&total>0&&positive/total>=MIN_POSITIVE_RATE;
 return {reviewCount:total,eligible,reason:eligible?null:!hasCount?'insufficient':'low_positive_rate',discovery:eligible?(total<200?.8:total<2000?.5:total<10000?.2:0):0};
}
