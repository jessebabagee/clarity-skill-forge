;; SkillForge Contract

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-invalid-module (err u101))
(define-constant err-already-completed (err u102))
(define-constant err-insufficient-score (err u103))

;; Data Variables
(define-data-var next-module-id uint u0)
(define-data-var next-quiz-id uint u0)
(define-data-var next-reward-id uint u0)

;; Data Maps
(define-map modules uint 
  {
    title: (string-ascii 100),
    description: (string-ascii 500),
    creator: principal,
    min-score: uint,
    reward-amount: uint
  }
)

(define-map quizzes uint 
  {
    module-id: uint,
    questions: (list 10 (string-ascii 200)),
    answers: (list 10 uint)
  }
)

(define-map user-progress (tuple (user principal) (module-id uint))
  {
    completed: bool,
    score: uint,
    timestamp: uint,
    reward-claimed: bool
  }
)

(define-map user-rewards principal
  {
    total-rewards: uint,
    modules-completed: uint
  }
)

;; Public Functions

;; Add a new learning module
(define-public (add-module (title (string-ascii 100)) (description (string-ascii 500)) (min-score uint) (reward-amount uint))
  (let
    ((module-id (var-get next-module-id)))
    (if (is-eq tx-sender contract-owner)
      (begin
        (map-set modules module-id
          {
            title: title,
            description: description,
            creator: tx-sender,
            min-score: min-score,
            reward-amount: reward-amount
          }
        )
        (var-set next-module-id (+ module-id u1))
        (ok module-id)
      )
      err-owner-only
    )
  )
)

;; Add a quiz to a module
(define-public (add-quiz (module-id uint) (questions (list 10 (string-ascii 200))) (answers (list 10 uint)))
  (let
    ((quiz-id (var-get next-quiz-id)))
    (if (is-eq tx-sender contract-owner)
      (begin
        (asserts! (is-some (map-get? modules module-id)) err-invalid-module)
        (map-set quizzes quiz-id
          {
            module-id: module-id,
            questions: questions,
            answers: answers
          }
        )
        (var-set next-quiz-id (+ quiz-id u1))
        (ok quiz-id)
      )
      err-owner-only
    )
  )
)

;; Complete a module and claim reward if eligible
(define-public (complete-module (module-id uint) (score uint))
  (let
    (
      (user-key {user: tx-sender, module-id: module-id})
      (module (unwrap! (map-get? modules module-id) err-invalid-module))
      (user-rewards (default-to {total-rewards: u0, modules-completed: u0} 
        (map-get? user-rewards tx-sender)))
    )
    (asserts! (is-none (map-get? user-progress user-key)) err-already-completed)
    (asserts! (>= score (get min-score module)) err-insufficient-score)
    
    (map-set user-progress user-key
      {
        completed: true,
        score: score,
        timestamp: block-height,
        reward-claimed: true
      }
    )

    (map-set user-rewards tx-sender
      {
        total-rewards: (+ (get total-rewards user-rewards) (get reward-amount module)),
        modules-completed: (+ (get modules-completed user-rewards) u1)
      }
    )
    
    (ok true)
  )
)

;; Read-only functions

(define-read-only (get-module (module-id uint))
  (ok (map-get? modules module-id))
)

(define-read-only (get-quiz (quiz-id uint))
  (ok (map-get? quizzes quiz-id))
)

(define-read-only (get-user-progress (user principal) (module-id uint))
  (ok (map-get? user-progress {user: user, module-id: module-id}))
)

(define-read-only (get-user-rewards (user principal))
  (ok (map-get? user-rewards user))
)
