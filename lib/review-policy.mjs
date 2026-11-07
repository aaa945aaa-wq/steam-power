export const REVIEW_ENDPOINT = 'https://api.steampowered.com/IUserReviewsService/GetAppReviews/v1/';

export function reviewUrl(appid) {
 const url = new URL(REVIEW_ENDPOINT);
 url.searchParams.set('input_json', JSON.stringify({appid, review_type: 0, purchase_type: 1, num_per_page: 1}));
 return url;
}

export function reviewSummary(payload) {
 return payload?.response?.query_summary;
}

export const MIN_REVIEWS=20;
export const MIN_POSITIVE_RATE=0.2;
// Ranking-only quality factor. Provisional bounded coefficient, not a calibrated probability.
// Eligibility above is unchanged; the factor never falls below QUALITY_BASE, so a candidate whose
// fit is more than 1/QUALITY_BASE (2x) the fit of another can never be overtaken by review quality alone.
export const QUALITY_BASE=0.5;
// Wilson score lower bound (95%): positive share discounted by sample size, so 20/20 ranks below 1000/1000.
export function wilsonLowerBound(positive,total,z=1.96){
 if(!Number.isSafeInteger(total)||total<=0||!Number.isSafeInteger(positive)||positive<0||positive>total)return 0;
 const p=positive/total,z2=z*z,denom=1+z2/total,centre=p+z2/(2*total),margin=z*Math.sqrt((p*(1-p)+z2/(4*total))/total);
 return Math.min(1,Math.max(0,(centre-margin)/denom));
}
export function evaluateReviews(summary){
 const total=summary?.total_reviews,positive=summary?.total_positive;
 const invalid=!Number.isSafeInteger(total)||total<0||
  !Number.isSafeInteger(positive)||positive<0||positive>total;
 if(invalid)return {reviewCount:null,eligible:false,reason:'unknown',discovery:0,positiveRate:null,quality:null,qualityFactor:null};
 const hasCount=total>=MIN_REVIEWS;
 const eligible=hasCount&&total>0&&positive/total>=MIN_POSITIVE_RATE;
 const quality=eligible?wilsonLowerBound(positive,total):null;
 return {reviewCount:total,eligible,reason:eligible?null:!hasCount?'insufficient':'low_positive_rate',discovery:eligible?(total<200?.8:total<2000?.5:total<10000?.2:0):0,positiveRate:total>0?positive/total:null,quality,qualityFactor:eligible?QUALITY_BASE+(1-QUALITY_BASE)*quality:null};
}
