# Calibration & Stability Subtasks Support

## Overview

The Driver Tasks system now supports a special type of subtask structure for "Calibrations & Stability" tasks. These are validation and approval subtasks that have unique characteristics compared to regular subtasks.

## Key Features

### 1. Special Issue Type
- Supports `"Sub Task"` as a valid issue_type in addition to `"Events"` and `"Hours"`
- Automatically mapped to `"events"` type in the system

### 2. Zero Amount Support
- Calibration tasks can have `amount_needed: 0`
- Regular tasks still require positive amounts
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

## Usage

Simply prepare your JSON file with the calibration task structure and use the existing bulk import feature. The system will automatically detect and handle calibration tasks appropriately. 