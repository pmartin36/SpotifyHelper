import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-left',
  templateUrl: './left.component.html',
  styleUrls: ['./left.component.css']
})
export class LeftComponent implements OnInit {

  @Input() properties: any[];
  selection: string;
  min: number;
  avg: number;
  max: number;

  constructor() { }

  ngOnInit() {
  }

}
