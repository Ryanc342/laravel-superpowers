<?php

namespace App\Http\Requests\Examples;

use App\Concerns\GeneratesExampleData;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * A batch change of the work queue example's selected tasks: mark them as
 * completed, or assign them to someone else. Its route is precognitive, so the
 * reassign dialog checks the assignee while the user picks one.
 */
class QueueUpdateRequest extends FormRequest
{
    use GeneratesExampleData;

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'distinct', Rule::in($this->exampleTasks()->pluck('id')->all())],
            'action' => ['required', Rule::in(['complete', 'reassign'])],
            'assignee' => [Rule::requiredIf($this->input('action') === 'reassign'), 'nullable', Rule::in($this->exampleAssignees())],
        ];
    }

    /**
     * The ids of the selected tasks.
     *
     * @return list<int>
     */
    public function taskIds(): array
    {
        return array_values(array_map(intval(...), $this->safe()->array('ids')));
    }

    /**
     * A change with no task is told what to do, not which rule it broke.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'ids.required' => __('Select at least one task.'),
            'ids.min' => __('Select at least one task.'),
        ];
    }

    /**
     * The fields' names in the messages, in the user's language.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'ids' => __('tasks'),
            'ids.*' => __('task'),
            'assignee' => __('assignee'),
        ];
    }
}
