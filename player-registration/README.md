# Player Registration Portal

A web interface for players to self-register for the cricket auction.

## Features
- Self-registration form with photo upload
- Player profile creation with stats
- Real-time form validation
- Responsive design for mobile and desktop
- Photo preview before upload
- Success/error feedback

## Running the App

```bash
# Install dependencies
npm install

# Start the development server (runs on port 3003)
npm start
```

The app will open at `http://localhost:3003`

## Form Fields

### Required
- **Full Name**: Player's complete name
- **Category**: Batsman, Bowler, All-Rounder, or Wicket-Keeper
- **Base Price**: Starting auction price (₹5-100 Lakhs)

### Optional
- **Photo**: Player image (max 5MB, image files only)
- **Career Statistics**:
  - Matches Played
  - Total Runs
  - Total Wickets
  - Batting Average
  - Strike Rate

## Usage Flow

1. Open the registration portal
2. Upload your photo (optional but recommended)
3. Fill in your basic information
4. Add career statistics if available
5. Click "Register for Auction"
6. Wait for admin approval

## Technical Details

- **Port**: 3003 (to avoid conflicts with other apps)
- **Backend API**: http://localhost:5001/api
- **Photo Upload**: Max 5MB, image files only
- **Framework**: React 18
- **Styling**: Custom CSS with gradient design
