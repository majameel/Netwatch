# NetPulse Monitor - Enhanced UI Testing Plan

## 🚀 UI Testing Checklist

### ✅ State Management Testing
- [ ] Add targets and refresh page - targets should persist
- [ ] Start monitoring, refresh page - monitoring should resume
- [ ] Change target settings - should persist across refreshes
- [ ] Alerts should persist across page refreshes
- [ ] Logs should persist across page refreshes

### ✅ Individual Target Settings Testing
- [ ] Each target can have different ping intervals
- [ ] Each target can have different latency thresholds
- [ ] Each target can have different packet loss thresholds
- [ ] Individual alerts can be enabled/disabled per target
- [ ] Settings changes should prompt restart when monitoring is active

### ✅ UI Component Testing
- [ ] Target cards collapse/expand properly
- [ ] Tab navigation works (History, Alerts, Live Logs)
- [ ] Performance charts render correctly
- [ ] Real-time data updates in all tabs
- [ ] Settings modal opens and saves correctly

### ✅ Monitoring Functionality Testing
- [ ] Start/Stop monitoring works for each target
- [ ] Real-time ping data appears in logs
- [ ] Latency charts update in real-time
- [ ] Packet loss detection works
- [ ] Alerts generate based on individual thresholds
- [ ] Multiple targets can monitor simultaneously with different intervals

### ✅ Data Persistence Testing
- [ ] localStorage saves complete state
- [ ] Monitoring state restores after page refresh
- [ ] Target history persists
- [ ] Alert history persists
- [ ] Settings persist across sessions

## 🎯 Critical Test Scenarios

### Scenario 1: Complete State Recovery
1. Add 2-3 targets with different settings
2. Start monitoring all targets
3. Let them run for 30 seconds to generate data
4. Refresh the page
5. ✅ All targets should be visible
6. ✅ Monitoring should resume automatically
7. ✅ All history data should be preserved

### Scenario 2: Individual Target Settings
1. Add target with default settings (5s interval, 150ms threshold)
2. Start monitoring
3. Change interval to 10s and threshold to 100ms
4. Should prompt to restart monitoring
5. ✅ New settings should apply immediately after restart

### Scenario 3: Multi-Target Monitoring
1. Add Google DNS (8.8.8.8) - 5s interval
2. Add Cloudflare DNS (1.1.1.1) - 3s interval  
3. Add Local Gateway - 10s interval
4. Start all three
5. ✅ Each should ping at its own interval
6. ✅ All should show real-time data independently

### Scenario 4: UI Responsiveness
1. Expand multiple targets simultaneously
2. Switch between tabs rapidly
3. ✅ Performance should remain smooth
4. ✅ No UI freezing or lag

## 🔧 Test Commands

### Add Test Targets:
- Google DNS: 8.8.8.8
- Cloudflare DNS: 1.1.1.1
- OpenDNS: 208.67.222.222
- Local Gateway: 192.168.1.1 (if accessible)

### Expected Results:
- All targets should be pingable
- Response times should be < 50ms for public DNS
- No packet loss under normal conditions
- Alerts should trigger if thresholds are set low

## 🐛 Known Issues to Watch For:
- Duplicate intervals causing memory leaks
- localStorage quota exceeded with large datasets
- Race conditions on rapid start/stop
- Chart rendering issues with large datasets
- Tab switching causing state loss

## 📊 Performance Metrics:
- Page load time: < 2 seconds
- Monitoring start time: < 1 second  
- Real-time update lag: < 500ms
- Memory usage: Monitor for leaks
- localStorage size: Keep under 5MB

## ✨ Success Criteria:
1. ✅ Complete state persistence across page refreshes
2. ✅ Individual target settings work correctly
3. ✅ Real-time monitoring with multiple intervals
4. ✅ Professional UI matching the provided mockups
5. ✅ No TypeScript errors or console warnings
6. ✅ Responsive performance with multiple targets
