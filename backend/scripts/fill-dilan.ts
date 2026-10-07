import 'dotenv/config';
import { db } from '../src/lib/db';
import * as store from '../src/modules/performance/store';
import type { Review } from '../src/modules/performance/types';

async function main() {
  const reviews = await store.list<Review>('reviews');
  const openReviews = reviews.filter(r => !r.closedAt);
  
  if (openReviews.length === 0) throw new Error("No open reviews found");
  
  for (const review of openReviews) {
    console.log("Found review to update:", review.id, "for employee", review.employeeId);
    
    // 1. Manager assessment shared
    review.manager.sharedAt = new Date().toISOString();
    review.goals.forEach(g => review.manager.goalRatings[g.id] = 4);
    review.template.competencies.forEach(c => review.manager.competencyRatings[c.id] = 4);
    review.template.questions.forEach(q => review.manager.answers[q.id] = "Great performance and good impact.");
    review.manager.comment = "Good job this year.";

    // 2. Development actions agreed
    if (review.development.length === 0) {
      review.development.push({
        id: require('crypto').randomUUID(),
        title: "Leadership training",
        description: "Attend leadership seminar",
        ownerId: review.employeeId,
        dueDate: "2026-12-31",
        status: "PLANNED"
      });
    }

    // 3. Final review meeting
    if (!review.meetingDate) {
      review.meetingDate = new Date().toISOString().split('T')[0];
      review.meetingNotes = "Discussed performance and future goals. All good.";
    }

    review.version++;
    review.updatedAt = new Date().toISOString();
    
    await store.transaction(async conn => {
      await store.save('reviews', review, conn);
    });
  }
  
  console.log("Updated open reviews successfully!");
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
