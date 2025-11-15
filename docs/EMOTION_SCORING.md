# Emotion Index Scoring System

## Overview

The **emotion_index** (0-100) measures emotional well-being from journal sessions. Each session receives its own score, and the weekly score is the average of all session scores.

## Calculation Formula

### Per Session Score

```python
score = 50  # Start at neutral baseline

For each detected emotion:
  if emotion is POSITIVE:
    score += 20 × confidence
  if emotion is NEGATIVE:
    score -= 20 × confidence

final_score = clamp(score, 0, 100)
```

### Weekly Score

```python
weekly_score = average(all_session_scores)
```

## Emotion Categories

### Positive Emotions (+20 × confidence)
- joy, joyful
- gratitude, grateful
- calm, peaceful
- hope, hopeful
- happiness, happy
- excitement, excited
- confidence, confident
- relief, relieved
- satisfaction, satisfied

### Negative Emotions (-20 × confidence)
- sadness, sad
- anger, angry
- fear, scared
- anxiety, anxious
- stress, stressed
- worry, worried
- frustration, frustrated
- overwhelm, overwhelmed
- tiredness, tired
- emptiness, empty
- stuck, blocked
- loneliness, lonely

## Interpretation Scale

| Range | Level | Icon | Description |
|-------|-------|------|-------------|
| 0-30 | Very Low | 🔴 | Significant distress detected |
| 30-45 | Low | 🟠 | Challenging emotional state |
| 45-55 | Neutral | 🟡 | Mixed emotions, balanced |
| 55-70 | Good | 🟢 | Positive emotional state |
| 70-100 | Excellent | 🟢 | Very positive well-being |

## Example Calculation

### Session 001

**Starting:** 50

**Negative emotions:**
- stressed (0.85): -17.0
- worried (0.80): -16.0
- anxious (0.75): -15.0
- empty (0.80): -16.0
- tired (0.90): -18.0
- stuck (0.70): -14.0

**Subtotal:** -96.0

**Positive emotions:**
- relieved (0.60): +12.0
- happy (0.70): +14.0
- hopeful (0.50): +10.0

**Subtotal:** +36.0

**Final:** 50 - 96 + 36 = -10 → **clamped to 0/100**

**Interpretation:** 🔴 Very Low - Session reflects significant emotional distress

### Week 44 Example

If you had 3 sessions:
- Session 1: 0/100
- Session 2: 25/100
- Session 3: 63/100

**Weekly Average:** (0 + 25 + 63) / 3 = **29.3/100**

**Interpretation:** 🔴 Very Low - The week overall was emotionally challenging

## Data Structure

### Session Level (`events_emotions.json`)

```json
{
  "session_id": "session_001",
  "created_at": "2025-10-31T12:00:00Z",
  "emotion_index": 0.0,
  "events": ["Had a difficult meeting", "Talked to a friend"],
  "emotions": [
    {"label": "stressed", "confidence": 0.85},
    {"label": "relieved", "confidence": 0.60}
  ],
  "themes": ["work", "relationships"]
}
```

### Weekly Level (`weekly_report.json`)

```json
{
  "week": "2025-W44",
  "sessions_count": 3,
  "emotion_index": 29.3,
  "trend": "flat",
  "session_summaries": [
    {
      "session_id": "session_001",
      "emotion_index": 0.0,
      "events": ["Had a difficult meeting", "Talked to a friend"],
      "emotions": [
        {"label": "stressed", "confidence": 0.85},
        {"label": "relieved", "confidence": 0.60}
      ]
    },
    {
      "session_id": "session_002",
      "emotion_index": 25.0,
      "events": ["Better day today"],
      "emotions": [
        {"label": "hopeful", "confidence": 0.70}
      ]
    },
    {
      "session_id": "session_003",
      "emotion_index": 63.0,
      "events": ["Productive work session"],
      "emotions": [
        {"label": "satisfied", "confidence": 0.80}
      ]
    }
  ]
}
```

## Implementation Notes

1. **Individual Session Scores:** Each session is scored independently during NLU processing
2. **Score Storage:** The `emotion_index` is saved in each session's `events_emotions.json`
3. **Weekly Aggregation:** The pipeline calculates the mean of all session scores
4. **Transparency:** Users can see both individual session scores and the weekly average
5. **Trend Analysis:** Future versions will compare weekly averages to detect improvement/decline

## Benefits

- ✅ **Granular Tracking:** See which specific sessions were difficult
- ✅ **Fair Averaging:** One bad session doesn't dominate the week
- ✅ **Transparency:** Clear breakdown of how the weekly score is calculated
- ✅ **Actionable Insights:** Identify patterns across sessions
