
// Mocking the logic from availabilityService.ts to debug locally

function generateSlots(rule, duration) {
    const slots = [];
    const [startHour, startMin] = rule.start.split(':').map(Number);
    const [endHour, endMin] = rule.end.split(':').map(Number); // Bug? rule uses 'end' but service expects 'end_time' or 'end'?
    // In DB audit: "start": "08:30", "end": "17:00"
    // In service: rule.start_time, rule.end_time (mapped from custom_availability)

    let currentMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    console.log(`Debug: Start ${startHour}:${startMin} (${currentMinutes}), End ${endHour}:${endMin} (${endMinutes})`);

    let step = duration;

    while (currentMinutes + duration <= endMinutes) {
        const hours = Math.floor(currentMinutes / 60);
        const minutes = currentMinutes % 60;
        slots.push(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
        currentMinutes += step;
    }
    return slots;
}

const rule = { start: "08:30", end: "17:00", slots_per_hour: 9 };
const duration = 30;

console.log("Generating slots for:", rule);
const result = generateSlots(rule, duration);
console.log("Result:", result);
