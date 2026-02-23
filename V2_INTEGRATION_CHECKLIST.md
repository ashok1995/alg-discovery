# V2 API Integration Checklist

## ✅ Completed

### Backend Service
- [x] V2 Recommendation service running on port 8282
- [x] API responds to POST `/api/v2/recommendations`
- [x] Supports strategies: swing, intraday, long_term
- [x] Supports risk levels: low, moderate, high

### Type Definitions
- [x] Created comprehensive V2 response types
- [x] Added interval performance types (5m, 30m, 1d changes)
- [x] Added trade targets types (target, stop loss, R:R)
- [x] Added technical indicators types

### Service Layer
- [x] Created RecommendationV2Service.ts
- [x] Implemented fetchV2Recommendations function
- [x] Added health check functionality
- [x] Proper timeout and error handling

### Configuration
- [x] Added RECOMMENDATION_V2_API_BASE_URL to env.stage
- [x] Updated API_CONFIG with V2 base URL
- [x] Port 8282 configured for staging

### UI Integration
- [x] Updated UnifiedRecommendations page to use V2 API
- [x] Added data transformation layer (convertV2ToLegacyFormat)
- [x] Enhanced table with new columns:
  - [x] 5m % change with trend indicators
  - [x] 30m % change with trend indicators
  - [x] Day % change with trend indicators
  - [x] Target price with expected return %
  - [x] Stop loss with risk-reward ratio
  - [x] Risk tag from ARM classification
- [x] Clickable symbols linking to Chartink
- [x] ARM strategy tooltips
- [x] Processing metrics display

### Code Quality
- [x] No linting errors
- [x] Type safety maintained
- [x] Error handling implemented
- [x] Console logging for debugging

### Documentation
- [x] Integration summary created
- [x] API response structure documented
- [x] Testing commands provided

## 🧪 Testing Required

### Manual Testing Steps

1. **Start Services**
   ```bash
   # Ensure recommendation service is running on port 8282
   curl http://localhost:8282/health
   ```

2. **Test API Directly**
   ```bash
   # Test swing strategy
   curl -X POST http://localhost:8282/api/v2/recommendations \
     -H "Content-Type: application/json" \
     -d '{"strategy": "swing", "risk_level": "moderate", "limit": 5}'
   
   # Test intraday strategy
   curl -X POST http://localhost:8282/api/v2/recommendations \
     -H "Content-Type: application/json" \
     -d '{"strategy": "intraday", "risk_level": "moderate", "limit": 5}'
   
   # Test long_term strategy
   curl -X POST http://localhost:8282/api/v2/recommendations \
     -H "Content-Type: application/json" \
     -d '{"strategy": "long_term", "risk_level": "moderate", "limit": 5}'
   ```

3. **Test Frontend Integration**
   ```bash
   cd frontend
   npm run start:stage
   # Navigate to http://localhost:3001/unified-recommendations
   ```

4. **Verify UI Elements**
   - [ ] Page loads without errors
   - [ ] Recommendations display in table
   - [ ] All strategy tabs work (Swing, Intraday Buy, Intraday Sell, Long-term Buy)
   - [ ] 5m, 30m, Day % columns show correct data
   - [ ] Target and Stop Loss columns display
   - [ ] Trend indicators (up/down arrows) show correctly
   - [ ] Symbol links open Chartink in new tab
   - [ ] Risk tags display ARM classification
   - [ ] ARM tooltips show strategy names
   - [ ] Metrics at top show correct stats
   - [ ] Risk level filter works (Low/Medium/High)
   - [ ] Min score slider works
   - [ ] Refresh button works
   - [ ] Auto-refresh toggle works

5. **Test Edge Cases**
   - [ ] Empty response handling
   - [ ] Network error handling
   - [ ] Service offline handling
   - [ ] Null/undefined field handling
   - [ ] Large datasets (50+ recommendations)

### Browser Testing
- [ ] Chrome
- [ ] Firefox
- [ ] Safari (if on Mac)
- [ ] Check console for errors
- [ ] Check network tab for API calls

### Performance Testing
- [ ] Initial load time < 3 seconds
- [ ] Refresh time < 2 seconds
- [ ] No memory leaks on repeated refreshes
- [ ] Table scrolling is smooth

## 🚀 Deployment Checklist (For Production)

### Pre-deployment
- [ ] All tests passing
- [ ] Code reviewed
- [ ] No console errors in staging
- [ ] Performance benchmarks met

### Environment Configuration
- [ ] Update RECOMMENDATION_V2_API_BASE_URL for production
- [ ] Set correct production endpoint URL
- [ ] Verify port configuration
- [ ] Update nginx proxy rules if needed

### Deployment Steps
1. [ ] Merge develop to main via PR
2. [ ] Deploy recommendation service to production
3. [ ] Deploy frontend with new configuration
4. [ ] Run smoke tests in production
5. [ ] Monitor error logs
6. [ ] Verify metrics and analytics

### Post-deployment
- [ ] Monitor API response times
- [ ] Check error rates
- [ ] Verify all strategies working
- [ ] User acceptance testing
- [ ] Update documentation

## 📊 Success Metrics

- [ ] API response time < 2 seconds
- [ ] Error rate < 1%
- [ ] All 3 strategies returning data
- [ ] User can see interval changes
- [ ] User can see target/stop loss
- [ ] Charts are clickable and open correctly

## 🐛 Known Issues / Notes

- V2 API is currently on staging (port 8282), not yet on production
- Some stocks may have null values for 5m/30m changes (expected for low-volume stocks)
- Risk tag mapping assumes certain keywords (high_opportunity, moderate, conservative)

## 📞 Support

If issues arise:
1. Check V2 service health: `curl http://localhost:8282/health`
2. Check browser console for errors
3. Check network tab for failed API calls
4. Review logs in V2 recommendation service
5. Verify environment variables are loaded correctly

---

**Integration Status:** ✅ COMPLETE - Ready for Testing
**Branch:** develop
**Next Step:** Manual testing of all functionality
