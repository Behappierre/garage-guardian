
import { vehicleData } from "../data/vehicleData.ts";

export async function handleCarSpecificQuestion(message: string): Promise<string> {
  const lowerMessage = message.toLowerCase().replace(/\s+/g, ' ').trim();
  
  // Try to identify the car model being asked about
  let carModel = null;
  
  // First try exact matches
  for (const model of Object.keys(vehicleData)) {
    if (lowerMessage.includes(model)) {
      carModel = model;
      break;
    }
  }
  
  // If no exact match, try partial matches
  if (!carModel) {
    for (const model of Object.keys(vehicleData)) {
      const modelParts = model.split(' ');
      if (modelParts.every(part => lowerMessage.includes(part))) {
        carModel = model;
        break;
      }
    }
  }

  if (!carModel) {
    return "I'm not sure which vehicle you're asking about. Could you specify the make and model?";
  }
  
  const carInfo = vehicleData[carModel as keyof typeof vehicleData];
  
  if (lowerMessage.includes('tyre pressure') || lowerMessage.includes('tire pressure')) {
    return `The recommended tire pressure for a ${carModel} is ${carInfo.tirePressure}.`;
  }
  
  if (lowerMessage.includes('oil') || lowerMessage.includes('oil capacity')) {
    return `The oil capacity for a ${carModel} is ${carInfo.oilCapacity}.`;
  }
  
  if (lowerMessage.includes('battery')) {
    return `The battery type for a ${carModel} is ${carInfo.batteryType}.`;
  }
  
  if (lowerMessage.includes('service') || lowerMessage.includes('interval')) {
    return `The recommended service interval for a ${carModel} is ${carInfo.serviceInterval}.`;
  }
  
  return `I have information about the ${carModel}. You can ask about:
- Tire pressure
- Oil capacity
- Battery type
- Service intervals`;
}
