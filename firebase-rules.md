rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Rules for trades collection
    match /trades/{tradeId} {
      // Allow authenticated users to create trades with their own userId
      allow create: if request.auth != null && 
                   request.auth.uid == request.resource.data.userId;
      
      // Allow authenticated users to read/write/delete only their own trades
      // Use separate rules for better clarity and error debugging
      allow read: if request.auth != null && 
                 request.auth.uid == resource.data.userId;
      
      allow update: if request.auth != null && 
                   request.auth.uid == resource.data.userId &&
                   request.auth.uid == request.resource.data.userId;
      
      allow delete: if request.auth != null && 
                   request.auth.uid == resource.data.userId;
    }
    
    // Rules for users collection (for user profiles)
    match /users/{userId} {
      allow read, write: if request.auth != null && 
                        request.auth.uid == userId;
    }
    
    // Debug: Allow admins to read all data (remove in production)
    // match /{document=**} {
    //   allow read: if request.auth != null && 
    //              request.auth.token.admin == true;
    // }
  }
}

## Key Changes Made:

1. **Separated read/write rules**: Instead of combining them, each operation has its own rule for better debugging.

2. **Consistent userId checks**: Ensures that users can only access their own trades.

3. **Update rule protection**: Prevents users from changing the userId of existing trades.

4. **Clearer rule structure**: Makes it easier to identify which rule is failing.

## Debugging Tips:

If you're still experiencing issues:

1. Check the Firebase Console logs for rule evaluation errors
2. Test rules in the Firebase Emulator with the Rules Playground
3. Temporarily add a debug rule to allow broader access for testing
4. Verify that `userId` is being set correctly in your documents

## Alternative Rules (if issues persist):

If the above rules still cause problems, try this simpler version:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /trades/{tradeId} {
      allow read, write: if request.auth != null && 
                        request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && 
                   request.auth.uid == request.resource.data.userId;
    }
    
    match /users/{userId} {
      allow read, write: if request.auth != null && 
                        request.auth.uid == userId;
    }
  }
}
```