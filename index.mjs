import { map } from './utils.mjs'
import {
  getCourses,
  getCourse,
  getLecture,
  getUsers,
  getUser,
  getPricingPlans,
  getPricingPlan,
} from './api.mjs'

async function exportCourses() {
  const courses = await getCourses()

  await map(courses, async ({ id: courseId }) => {
    const course = await getCourse(courseId)
    const lectures = course.lecture_sections.flatMap(section =>
      section.lectures.map(({ id }) => ({
        sectionId: section.id,
        lectureId: id,
      }))
    )

    await map(lectures, async ({ sectionId, lectureId }) => {
      await getLecture(courseId, sectionId, lectureId)
    })
  })
}

async function exportUsers() {
  await map(await getUsers(), async ({ id: userId }) => {
    await getUser(userId)
  })
}

async function exportPricingPlans() {
  await map(await getPricingPlans(), async ({ id: pricingPlanId }) => {
    await getPricingPlan(pricingPlanId)
  })
}

await exportUsers()
await exportPricingPlans()
await exportCourses()
