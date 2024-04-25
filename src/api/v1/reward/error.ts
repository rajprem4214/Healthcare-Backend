// Stores all the custom errors 

export class InvalidConditionError extends Error{
    constructor(msg?:string){
     super(msg)
     this.name="InvalidRewardCondition"
     
    }
}