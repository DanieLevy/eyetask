# Calibration & Stability Subtasks Support

## Overview

The Driver Tasks system now supports special types of subtask structures for "Calibrations & Stability" tasks. These are validation and approval subtasks that have unique characteristics compared to regular subtasks.

## Key Features

### 1. Special Issue Types
- Supports `"Sub Task"` as a valid issue_type in addition to `"Events"`, `"Hours"`, and `"Loops"`
- `"Sub Task"` is automatically mapped to `"events"` type in the system
- `"Loops"` is a new type for repetitive calibration tasks

### 2. Zero Amount Support
- Calibration tasks (Sub Task type) can have `amount_needed: 0`
- Loops tasks can also have `amount_needed: 0` as placeholders
- Regular Events/Hours tasks require positive amounts
- The validation automatically detects calibration tasks

### 3. Automatic Labeling
When importing calibration tasks, the system automatically adds:
- `calibration` label
- `stability` label
- Specific type labels based on the subtask summary:
  - `setup-approval` - for setup approval tasks
  - `calibration-approval` - for calibration approval tasks
  - `di-validation` - for DI validation tasks
  - `gt-approval` - for GT approval tasks
  - `c2l-approval` - for C2L approval tasks

### 4. Visual Indicators
In the admin panel, calibration subtasks are displayed with:
- Blue "כיול" (Calibration) badge
- Purple "יציבות" (Stability) badge
- Special blue text color for zero amounts
- Type-specific labels for easy identification

### 5. Supported Issue Types
The system now supports four issue types:
- `"Events"` - for event-based tasks (אירועים)
- `"Hours"` - for time-based tasks (שעות)
- `"Loops"` - for repetitive/loop-based tasks (לולאות)
- `"Sub Task"` - for calibration/validation tasks (mapped to events)

## JSON Structure Example

```json
{
  "parent_issues": [
    {
      "key": "DATACO-13495",
      "title": "SV/KSS - RD53 Validations",
      "extra_sensors": null,
      "target_car": "AV fleet",
      "subtasks": [
        {
          "dataco_number": "DATACO-13496",
          "summary": "SV/KSS - RD53 Validations Setup approval",
          "issue_type": "Sub Task",
          "amount_needed": 0,
          "weather": "Mixed",
          "road_type": "Mixed",
          "day_time": "Mixed",
          "labels": []
        },
        {
          "dataco_number": "DATACO-13497",
          "summary": "SV/KSS - RD53 Validations Calibration approval",
          "issue_type": "Sub Task",
          "amount_needed": 0,
          "weather": "Mixed",
          "road_type": "Mixed",
          "day_time": "Mixed",
          "labels": []
        },
        {
          "dataco_number": "DATACO-13510",
          "summary": "SV/KSS - RD53 Stability Loop Tests",
          "issue_type": "Loops",
          "amount_needed": 50,
          "weather": "Clear",
          "road_type": "Test Track",
          "day_time": "Day",
          "labels": ["stability-test"]
        }
      ]
    }
  ]
}
```

## How It Works

1. **Detection**: The system detects calibration tasks by checking if:
   - All subtasks have `amount_needed: 0` OR
   - Any subtask has `issue_type: "Sub Task"`

2. **Validation**: The validation logic allows:
   - Zero amounts for calibration tasks
   - "Sub Task" as a valid issue type
   - "Loops" as a valid issue type for repetitive tasks
   - All existing validations still apply for regular tasks

3. **Import Process**:
   - Calibration tasks are processed with special handling
   - Automatic labels are added
   - Visual indicators are applied in the UI

## Benefits

1. **Flexibility**: Supports both regular work tasks and calibration/validation tasks
2. **Clarity**: Visual indicators make it easy to distinguish task types
3. **Automation**: Automatic labeling reduces manual work
4. **Backward Compatible**: Existing bulk import functionality remains unchanged
5. **Extended Types**: Support for loop-based tasks for repetitive calibration procedures

## Edge Case Handling

The system robustly handles various edge cases that may appear in JIRA exports:

### 1. Combined Road Types
- **Input**: `"Rural/Sub-Urban"` or similar slash-separated values
- **Handling**: System extracts the first valid road type (e.g., "Rural")
- **Fallback**: Defaults to "Mixed" if no valid type is found

### 2. Unknown Weather
- **Input**: `"Unknown"` or `"unknown"`
- **Handling**: Automatically mapped to "Mixed"
- **Validation**: Shows warning during import but doesn't block

### 3. Zero Amount with Loops
- **Input**: Loops type with `amount_needed: 0`
- **Handling**: Always treated as valid (placeholders are allowed)
- **Note**: Won't trigger calibration labels
- **Special Rule**: Loops type can have 0 amount even in non-calibration tasks

### 4. Multiple Target Cars
- **Input**: Array of target cars
- **Handling**: Fully supported, all cars are assigned to subtasks

### 5. Mixed Day Times
- **Input**: `"Mixed"` as day_time
- **Handling**: Expanded to all times: ['day', 'night', 'dusk', 'dawn']

## Validation Warnings

The validation endpoint now provides warnings for non-blocking issues:
- Unknown weather values that will be mapped
- Combined road types that will be simplified
- Loops with zero amounts that might be placeholders

These warnings help users understand how their data will be processed without blocking the import.

## Usage

Simply prepare your JSON file with the calibration task structure and use the existing bulk import feature. The system will automatically detect and handle calibration tasks appropriately. 